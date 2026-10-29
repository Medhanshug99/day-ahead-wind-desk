"""
FastAPI route handlers.

Endpoints
---------
GET /api/health                     -- liveness + data status
GET /api/forecast/decision          -- decision-time forecast for a delivery day
GET /api/comparison                 -- forecast vs actual time series
GET /api/metrics                    -- accuracy metrics (overall / day / hour)
GET /api/metrics/horizon            -- error vs forecast horizon (supplementary)
"""

from __future__ import annotations

from datetime import date, timedelta

from fastapi import APIRouter, HTTPException, Query

from .config import settings
from .core_logic import (
    aggregate_actuals_to_hourly,
    build_comparison,
    build_full_comparison,
    convert_to_london,
    get_cutoff_datetime,
    select_decision_forecasts,
)
from .data_loader import data_store
from .metrics import compute_horizon_metrics, compute_metrics
from .models import (
    ComparisonResponse,
    ComparisonRow,
    CoverageInfo,
    DecisionResponse,
    HalfHourlyActual,
    HealthResponse,
    HorizonMetricRow,
    HorizonMetricsResponse,
    HourlyRow,
    MetricsResponse,
    MetricValues,
)

router = APIRouter(prefix="/api")


# ── helpers ──────────────────────────────────────────────────────────

def _require_data() -> None:
    if not data_store.is_loaded:
        raise HTTPException(503, "Data not loaded. Run fetch_data.py first.")


def _validate_delivery(d: date) -> None:
    if not settings.validate_delivery_date(d):
        raise HTTPException(
            400,
            f"Date {d} is outside the delivery window "
            f"({settings.delivery_start} to {settings.delivery_end}).",
        )


# ── GET /api/health ──────────────────────────────────────────────────

@router.get("/health", response_model=HealthResponse)
def health():
    return HealthResponse(
        status="ok" if data_store.is_loaded else "no_data",
        data_loaded=data_store.is_loaded,
        fuelhh_records=len(data_store.fuelhh) if data_store.is_loaded else 0,
        windfor_records=len(data_store.windfor) if data_store.is_loaded else 0,
        delivery_window=f"{settings.delivery_start} to {settings.delivery_end}",
        cutoff_hour=settings.decision_cutoff_hour,
        windfor_publish_schedule=data_store.windfor_publish_schedule,
    )


# ── GET /api/forecast/decision ───────────────────────────────────────

@router.get("/forecast/decision", response_model=DecisionResponse)
def forecast_decision(
    delivery_date: date = Query(..., description="Delivery day (YYYY-MM-DD)"),
):
    _require_data()
    _validate_delivery(delivery_date)

    cutoff_hour = settings.decision_cutoff_hour
    cutoff_dt = get_cutoff_datetime(delivery_date, cutoff_hour)
    decision_date = delivery_date - timedelta(days=1)

    # Decision-time forecasts (24 hourly rows)
    fc = select_decision_forecasts(
        data_store.windfor, delivery_date, cutoff_hour,
    )

    # Hourly actuals
    hourly_act = aggregate_actuals_to_hourly(
        data_store.fuelhh, delivery_date,
    )

    # Join
    comp = build_comparison(fc, hourly_act)

    # Build response rows
    hourly_data = []
    for _, row in comp.iterrows():
        hourly_data.append(HourlyRow(
            start_time=row["start_time"],
            start_time_local=convert_to_london(row["start_time"]),
            forecast_mw=row["forecast_mw"],
            publish_time=row["publish_time"] if not row["forecast_missing"] else None,
            actual_mw=row["actual_mw"] if not row.get("actual_missing", True) else None,
            actual_hh1_mw=row.get("hh1_mw"),
            actual_hh2_mw=row.get("hh2_mw"),
            error_mw=row["error_mw"] if not (row["forecast_missing"] or row.get("actual_missing", False)) else None,
            forecast_missing=bool(row["forecast_missing"]),
            actual_missing=bool(row.get("actual_missing", False)),
        ))

    # Raw half-hourly actuals
    fuelhh_day = data_store.fuelhh[
        data_store.fuelhh["settlementDate"] == str(delivery_date)
    ].sort_values("startTime")

    hh_actuals = [
        HalfHourlyActual(
            start_time=r["startTime"],
            settlement_period=int(r["settlementPeriod"]),
            generation_mw=float(r["generation"]),
        )
        for _, r in fuelhh_day.iterrows()
    ]

    coverage = CoverageInfo(
        total_hours=24,
        forecast_present=int((~comp["forecast_missing"]).sum()),
        actual_present=int((~comp["actual_missing"]).sum()),
        matched=int(comp["error_mw"].notna().sum()),
    )

    return DecisionResponse(
        delivery_date=delivery_date,
        decision_date=decision_date,
        cutoff_utc=cutoff_dt,
        cutoff_local=convert_to_london(cutoff_dt),
        hourly_data=hourly_data,
        half_hourly_actuals=hh_actuals,
        coverage=coverage,
    )


# ── GET /api/comparison ──────────────────────────────────────────────

@router.get("/comparison", response_model=ComparisonResponse)
def comparison(
    start: date = Query(..., description="Start delivery date"),
    end: date = Query(..., description="End delivery date"),
):
    _require_data()
    _validate_delivery(start)
    _validate_delivery(end)
    if start > end:
        raise HTTPException(400, "start must be <= end")

    comp = build_full_comparison(
        data_store.windfor, data_store.fuelhh,
        start, end, settings.decision_cutoff_hour,
    )

    rows = []
    for _, r in comp.iterrows():
        rows.append(ComparisonRow(
            delivery_date=r["delivery_date"],
            start_time=r["start_time"],
            start_time_local=convert_to_london(r["start_time"]),
            forecast_mw=r["forecast_mw"],
            actual_mw=r["actual_mw"] if not r.get("actual_missing", True) else None,
            error_mw=r["error_mw"] if not (r["forecast_missing"] or r.get("actual_missing", False)) else None,
            publish_time=r["publish_time"] if not r["forecast_missing"] else None,
        ))

    cov = CoverageInfo(
        total_hours=len(comp),
        forecast_present=int((~comp["forecast_missing"]).sum()),
        actual_present=int((~comp["actual_missing"]).sum()),
        matched=int(comp["error_mw"].notna().sum()),
    )

    return ComparisonResponse(start=start, end=end, data=rows, coverage=cov)


# ── GET /api/metrics ─────────────────────────────────────────────────

@router.get("/metrics", response_model=MetricsResponse)
def metrics(
    start: date = Query(default=None, description="Start delivery date (default: window start)"),
    end: date = Query(default=None, description="End delivery date (default: window end)"),
    group_by: str = Query(default="overall", description="overall | day | hour"),
):
    _require_data()
    s = start or settings.delivery_start
    e = end or settings.delivery_end
    _validate_delivery(s)
    _validate_delivery(e)

    if group_by not in ("overall", "day", "hour"):
        raise HTTPException(400, "group_by must be overall, day, or hour")

    comp = build_full_comparison(
        data_store.windfor, data_store.fuelhh,
        s, e, settings.decision_cutoff_hour,
    )
    raw = compute_metrics(comp, group_by)
    return MetricsResponse(
        start=s, end=e, group_by=group_by,
        metrics=[MetricValues(**m) for m in raw],
    )


# ── GET /api/metrics/horizon ─────────────────────────────────────────

@router.get("/metrics/horizon", response_model=HorizonMetricsResponse)
def metrics_horizon():
    """
    Error vs forecast horizon using ALL published forecasts (not just
    the decision-time selection).  Supplementary analysis for traders
    who want to understand how accuracy degrades with lead time.
    """
    _require_data()

    # Build hourly actuals for the full delivery window
    hourly = aggregate_actuals_to_hourly(data_store.fuelhh)

    raw = compute_horizon_metrics(
        data_store.windfor, hourly,
        start_date=settings.delivery_start,
        end_date=settings.delivery_end,
    )

    return HorizonMetricsResponse(
        description=(
            "Forecast error as a function of lead time (horizon). "
            "Uses ALL published forecasts, not just the decision-time "
            "selection.  This is supplementary analysis."
        ),
        note=(
            "Horizon = target startTime minus publishTime in hours. "
            "Only positive horizons (genuine forecasts) are included."
        ),
        data=[HorizonMetricRow(**r) for r in raw],
    )
