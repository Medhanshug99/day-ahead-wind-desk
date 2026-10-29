"""
Core forecast-selection and comparison logic.

**Pure functions** -- no I/O, no side effects, no API calls.
All datetimes are UTC-aware internally.

Key concepts
------------
- **Delivery day D**: the day electricity is physically delivered/consumed.
- **Decision day D-1**: the day before, when procurement bids are submitted.
- **Cutoff**: ``D-1 at DECISION_CUTOFF_HOUR:00 UTC`` (default 09:00).
  EPEX Spot GB day-ahead auction gate closure is 09:20 UK time on D-1
  (source: EPEX Spot SE, "GB Day-Ahead Auction Trading Specifications").
  Our default of 09:00 is 20 min before actual closure -- conservative.
- **Decision forecast**: for each hourly target on D, the *latest* WINDFOR
  forecast whose ``publishTime <= cutoff``.

Resolution alignment
--------------------
WINDFOR forecasts are **hourly** (startTime always HH:00).
FUELHH actuals are **half-hourly** (startTime HH:00 and HH:30).

Rule: ``WINDFOR startTime=HH:00`` aligns with
  ``mean(FUELHH HH:00, FUELHH HH:30)`` for the same hour.

WINDFOR publish schedule (observed Jan 2026)
--------------------------------------------
8 regular publishes per day at: 02:30, 04:30, 07:30, 09:30, 11:30,
15:30, 18:30, 22:30 UTC, plus occasional irregular publishes.
With a 09:00 cutoff the latest eligible publish is typically 07:30.
"""

from __future__ import annotations

import zoneinfo
from datetime import date, datetime, timedelta, timezone
from typing import Optional

import numpy as np
import pandas as pd

UTC = timezone.utc
LONDON_TZ = zoneinfo.ZoneInfo("Europe/London")


# ---------------------------------------------------------------------------
# Timezone helpers
# ---------------------------------------------------------------------------

def convert_to_london(dt: datetime | pd.Timestamp) -> str:
    """Convert a UTC datetime to an ISO-8601 string in Europe/London."""
    if isinstance(dt, pd.Timestamp):
        dt = dt.to_pydatetime()
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=UTC)
    return dt.astimezone(LONDON_TZ).isoformat()


def get_cutoff_datetime(delivery_date: date, cutoff_hour: int = 9) -> datetime:
    """
    Decision cutoff = D-1 at ``cutoff_hour``:00 UTC.

    In January (GMT) UK time == UTC, so no DST adjustment is needed.
    The function is timezone-correct year-round because the env var
    is documented as *UK time* and January is always GMT.
    """
    decision_day = delivery_date - timedelta(days=1)
    return datetime(
        decision_day.year, decision_day.month, decision_day.day,
        cutoff_hour, 0, 0, tzinfo=UTC,
    )


# ---------------------------------------------------------------------------
# Forecast selection
# ---------------------------------------------------------------------------

def select_decision_forecasts(
    forecasts_df: pd.DataFrame,
    delivery_date: date,
    cutoff_hour: int = 9,
) -> pd.DataFrame:
    """
    For each hourly target on *delivery_date*, pick the **latest** WINDFOR
    forecast published **at or before** the cutoff on D-1.

    Parameters
    ----------
    forecasts_df :
        All WINDFOR rows.  Must have columns ``startTime`` (tz-aware UTC),
        ``publishTime`` (tz-aware UTC), ``generation`` (MW).
    delivery_date :
        The delivery day.
    cutoff_hour :
        Hour on D-1 for the cutoff (0-23).

    Returns
    -------
    DataFrame with 24 rows (one per hour, 00:00-23:00) and columns:
        start_time, forecast_mw, publish_time, forecast_missing
    """
    cutoff = get_cutoff_datetime(delivery_date, cutoff_hour)

    day_start = datetime(
        delivery_date.year, delivery_date.month, delivery_date.day,
        tzinfo=UTC,
    )
    targets = pd.date_range(start=day_start, periods=24, freq="h")

    # Fast filter: restrict to delivery day and published <= cutoff
    eligible = forecasts_df[
        (forecasts_df["startTime"] >= day_start)
        & (forecasts_df["startTime"] <= targets[-1])
        & (forecasts_df["publishTime"] <= cutoff)
    ]

    if not eligible.empty:
        # Sort by publishTime so last() is the latest publish
        latest = (
            eligible.sort_values("publishTime")
            .groupby("startTime")
            .last()
            .reset_index()
        )
    else:
        latest = pd.DataFrame(columns=["startTime", "generation", "publishTime"])

    # Template dataframe ensuring all 24 hours exist
    template = pd.DataFrame({"startTime": targets})
    merged = pd.merge(template, latest, on="startTime", how="left")

    rows: list[dict] = []
    for _, row in merged.iterrows():
        missing = pd.isna(row.get("generation"))
        rows.append({
            "start_time": row["startTime"],
            "forecast_mw": float(row["generation"]) if not missing else None,
            "publish_time": row["publishTime"] if not missing else None,
            "forecast_missing": bool(missing),
        })

    return pd.DataFrame(rows)


# ---------------------------------------------------------------------------
# Actuals aggregation
# ---------------------------------------------------------------------------

def aggregate_actuals_to_hourly(
    actuals_df: pd.DataFrame,
    delivery_date: Optional[date] = None,
) -> pd.DataFrame:
    """
    Average the two half-hourly FUELHH values per clock hour.

    ``WINDFOR startTime=HH:00`` maps to:
    - ``FUELHH startTime=HH:00`` (first half, settlement period 2*H+1)
    - ``FUELHH startTime=HH:30`` (second half, settlement period 2*H+2)

    Returns DataFrame with columns:
        start_time, actual_mw, hh1_mw, hh2_mw, hh_count
    """
    df = actuals_df.copy()

    if delivery_date is not None and "settlementDate" in df.columns:
        df = df[df["settlementDate"] == str(delivery_date)]

    if df.empty:
        return pd.DataFrame(
            columns=["start_time", "actual_mw", "hh1_mw", "hh2_mw", "hh_count"],
        )

    df = df.sort_values("startTime")
    df["hour"] = df["startTime"].dt.floor("h")

    rows: list[dict] = []
    for hour_ts, grp in df.groupby("hour"):
        vals = grp.sort_values("startTime")["generation"].values
        hh1 = float(vals[0]) if len(vals) >= 1 else np.nan
        hh2 = float(vals[1]) if len(vals) >= 2 else np.nan
        valid = [v for v in [hh1, hh2] if not np.isnan(v)]
        rows.append({
            "start_time": hour_ts,
            "actual_mw": float(np.mean(valid)) if valid else np.nan,
            "hh1_mw": hh1,
            "hh2_mw": hh2,
            "hh_count": len(vals),
        })

    return pd.DataFrame(rows)


# ---------------------------------------------------------------------------
# Comparison builder
# ---------------------------------------------------------------------------

def build_comparison(
    decision_forecasts: pd.DataFrame,
    hourly_actuals: pd.DataFrame,
) -> pd.DataFrame:
    """
    Left-join forecasts with actuals on ``start_time`` and compute error.

    ``error = forecast - actual``  (positive  =>  over-estimate).
    """
    merged = pd.merge(
        decision_forecasts,
        hourly_actuals[["start_time", "actual_mw", "hh1_mw", "hh2_mw"]],
        on="start_time",
        how="left",
    )
    merged["actual_missing"] = merged["actual_mw"].isna()

    # Only compute error when both values are present
    merged["error_mw"] = np.where(
        merged["forecast_missing"] | merged["actual_missing"],
        np.nan,
        merged["forecast_mw"] - merged["actual_mw"],
    )
    return merged


# ---------------------------------------------------------------------------
# Multi-day helpers (used by /api/comparison and /api/metrics)
# ---------------------------------------------------------------------------

def build_full_comparison(
    forecasts_df: pd.DataFrame,
    actuals_df: pd.DataFrame,
    start_date: date,
    end_date: date,
    cutoff_hour: int = 9,
) -> pd.DataFrame:
    """
    Build forecast-vs-actual comparison for a range of delivery days.

    Returns a DataFrame with all columns from ``build_comparison`` plus
    ``delivery_date``.
    """
    all_frames: list[pd.DataFrame] = []
    current = start_date
    while current <= end_date:
        fc = select_decision_forecasts(forecasts_df, current, cutoff_hour)
        act = aggregate_actuals_to_hourly(actuals_df, current)
        comp = build_comparison(fc, act)
        comp["delivery_date"] = current
        all_frames.append(comp)
        current += timedelta(days=1)

    if not all_frames:
        return pd.DataFrame()
    return pd.concat(all_frames, ignore_index=True)
