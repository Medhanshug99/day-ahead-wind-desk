"""
Forecast-accuracy metrics.

All functions are pure -- they accept DataFrames and return plain dicts/lists.

Metrics computed (on decision-time forecasts only unless noted):
    MAE   -- mean absolute error (MW)
    RMSE  -- root-mean-square error (MW), penalises large errors
    Bias  -- mean signed error (MW); positive = systematic over-estimate
    MAPE  -- mean absolute percentage error (%); zero-actual rows excluded
    P95   -- 95th percentile of |error| (MW); planning buffer for traders
    Error % of mean actual -- P95 / mean(actual) * 100

Groupings: overall, per-day, per-hour-of-day.
"""

from __future__ import annotations

import numpy as np
import pandas as pd


def _safe_mape(errors: np.ndarray, actuals: np.ndarray) -> float | None:
    """MAPE that guards against divide-by-zero.  Returns None if all zero."""
    nonzero = actuals != 0
    if not nonzero.any():
        return None
    return float(np.mean(np.abs(errors[nonzero] / actuals[nonzero])) * 100)


def _metrics_for_group(errors: np.ndarray, actuals: np.ndarray,
                       forecasts: np.ndarray) -> dict:
    abs_err = np.abs(errors)
    mean_actual = float(np.mean(actuals)) if len(actuals) else 0.0
    p95 = float(np.percentile(abs_err, 95)) if len(abs_err) else 0.0

    return {
        "mae": round(float(np.mean(abs_err)), 2),
        "rmse": round(float(np.sqrt(np.mean(errors ** 2))), 2),
        "bias": round(float(np.mean(errors)), 2),
        "mape": round(_safe_mape(errors, actuals), 2) if _safe_mape(errors, actuals) is not None else None,
        "p95_abs_error": round(p95, 2),
        "error_pct_mean_actual": (
            round(p95 / mean_actual * 100, 2) if mean_actual != 0 else None
        ),
        "count": len(errors),
        "mean_actual": round(mean_actual, 2),
        "mean_forecast": round(float(np.mean(forecasts)), 2),
    }


def compute_metrics(
    comparison_df: pd.DataFrame,
    group_by: str = "overall",
) -> list[dict]:
    """
    Compute accuracy metrics on the joined comparison data.

    Parameters
    ----------
    comparison_df :
        Output of ``build_comparison`` / ``build_full_comparison``.
        Must have columns: ``error_mw``, ``actual_mw``, ``forecast_mw``,
        ``start_time``, ``delivery_date``.
    group_by :
        ``"overall"`` | ``"day"`` | ``"hour"``

    Returns
    -------
    List of metric dicts, one per group.
    """
    df = comparison_df.dropna(subset=["error_mw"]).copy()
    if df.empty:
        return []

    if group_by == "overall":
        groups = [("overall", df)]
    elif group_by == "day":
        df["_grp"] = df["delivery_date"].astype(str)
        groups = list(df.groupby("_grp"))
    elif group_by == "hour":
        df["_grp"] = df["start_time"].dt.hour
        groups = list(df.groupby("_grp"))
    else:
        raise ValueError(f"Unknown group_by: {group_by!r}")

    results = []
    for key, grp in groups:
        m = _metrics_for_group(
            grp["error_mw"].values,
            grp["actual_mw"].values,
            grp["forecast_mw"].values,
        )
        m["group_key"] = str(key)
        results.append(m)

    return results


def compute_horizon_metrics(
    forecasts_df: pd.DataFrame,
    hourly_actuals_df: pd.DataFrame,
    start_date=None,
    end_date=None,
) -> list[dict]:
    """
    Error as a function of forecast horizon.  Uses **all** published
    forecasts, not just the decision-time selection.  This is supplementary
    analysis -- it answers "how does accuracy degrade with lead time?"

    Horizon = (target startTime - publishTime) in hours.
    Negative horizons (hindcast/nowcast updates) are excluded.
    """
    # Filter actuals to delivery window
    act = hourly_actuals_df.copy()
    if start_date is not None:
        act = act[act["start_time"] >= pd.Timestamp(start_date, tz="UTC")]
    if end_date is not None:
        # Include end_date fully (up to 23:00)
        end_ts = pd.Timestamp(end_date, tz="UTC") + pd.Timedelta(hours=23)
        act = act[act["start_time"] <= end_ts]

    if act.empty:
        return []

    merged = pd.merge(
        forecasts_df,
        act[["start_time", "actual_mw"]],
        left_on="startTime",
        right_on="start_time",
        how="inner",
    )
    if merged.empty:
        return []

    merged["horizon_hours"] = (
        (merged["startTime"] - merged["publishTime"]).dt.total_seconds() / 3600
    )
    # Exclude negative horizons (published after the target time)
    merged = merged[merged["horizon_hours"] > 0]
    merged["error"] = merged["generation"] - merged["actual_mw"]

    # Bin by rounded hour
    merged["horizon_bin"] = merged["horizon_hours"].round()

    results = []
    for hbin, grp in merged.groupby("horizon_bin"):
        errors = grp["error"].values
        actuals = grp["actual_mw"].values
        abs_err = np.abs(errors)
        results.append({
            "horizon_hours": float(hbin),
            "mae": round(float(np.mean(abs_err)), 2),
            "rmse": round(float(np.sqrt(np.mean(errors ** 2))), 2),
            "bias": round(float(np.mean(errors)), 2),
            "mape": round(_safe_mape(errors, actuals), 2) if _safe_mape(errors, actuals) is not None else None,
            "count": len(grp),
        })

    return sorted(results, key=lambda r: r["horizon_hours"])
