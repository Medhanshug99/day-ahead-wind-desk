"""Shared test fixtures with synthetic WINDFOR and FUELHH data."""

from __future__ import annotations

from datetime import date, datetime, timezone

import pandas as pd
import pytest

UTC = timezone.utc


@pytest.fixture
def sample_forecasts() -> pd.DataFrame:
    """
    Synthetic WINDFOR data for delivery_date = 2026-01-15.

    Contains forecasts from multiple publish times for the same target,
    including one *exactly at* the cutoff (09:00 on Jan 14) and one
    *just after* (09:30 on Jan 14).
    """
    rows = []
    target = datetime(2026, 1, 15, 12, 0, 0, tzinfo=UTC)  # 12:00 target

    # Forecast A: published well before cutoff  (should be eligible)
    rows.append({"startTime": target, "publishTime": datetime(2026, 1, 14, 4, 30, 0, tzinfo=UTC), "generation": 10000})
    # Forecast B: published at 07:30  (eligible, should be selected if cutoff=09:00)
    rows.append({"startTime": target, "publishTime": datetime(2026, 1, 14, 7, 30, 0, tzinfo=UTC), "generation": 10500})
    # Forecast C: published EXACTLY at cutoff 09:00  (should be INCLUDED -- <= not <)
    rows.append({"startTime": target, "publishTime": datetime(2026, 1, 14, 9, 0, 0, tzinfo=UTC), "generation": 11000})
    # Forecast D: published at 09:30  (should be EXCLUDED -- after cutoff)
    rows.append({"startTime": target, "publishTime": datetime(2026, 1, 14, 9, 30, 0, tzinfo=UTC), "generation": 11500})
    # Forecast E: published on delivery day itself  (should be EXCLUDED)
    rows.append({"startTime": target, "publishTime": datetime(2026, 1, 15, 7, 30, 0, tzinfo=UTC), "generation": 12000})

    # Also add forecasts for a few other hours on Jan 15
    for hour in (0, 6, 18, 23):
        target_h = datetime(2026, 1, 15, hour, 0, 0, tzinfo=UTC)
        rows.append({"startTime": target_h, "publishTime": datetime(2026, 1, 14, 7, 30, 0, tzinfo=UTC), "generation": 9000 + hour * 100})

    return pd.DataFrame(rows)


@pytest.fixture
def sample_actuals() -> pd.DataFrame:
    """
    Synthetic FUELHH (half-hourly) data for Jan 15.

    Contains 48 half-hourly rows (SP 1-48).
    """
    rows = []
    base = datetime(2026, 1, 15, 0, 0, 0, tzinfo=UTC)
    for sp in range(1, 49):
        start = base + pd.Timedelta(minutes=(sp - 1) * 30)
        rows.append({
            "startTime": start,
            "publishTime": start + pd.Timedelta(minutes=30),  # published after the period
            "settlementDate": "2026-01-15",
            "settlementPeriod": sp,
            "fuelType": "WIND",
            "generation": 10000 + sp * 50,  # linear ramp for easy verification
        })
    return pd.DataFrame(rows)


@pytest.fixture
def sample_actuals_with_zero() -> pd.DataFrame:
    """Actuals with zero generation for MAPE zero-safety testing."""
    base = datetime(2026, 1, 15, 0, 0, 0, tzinfo=UTC)
    rows = []
    for sp in range(1, 5):  # Just 2 hours (4 half-hours)
        start = base + pd.Timedelta(minutes=(sp - 1) * 30)
        gen = 0 if sp <= 2 else 500  # First hour = 0 MW, second hour = 500 MW
        rows.append({
            "startTime": start,
            "publishTime": start + pd.Timedelta(minutes=30),
            "settlementDate": "2026-01-15",
            "settlementPeriod": sp,
            "fuelType": "WIND",
            "generation": gen,
        })
    return pd.DataFrame(rows)


@pytest.fixture
def no_forecast_before_cutoff() -> pd.DataFrame:
    """WINDFOR data where all forecasts are published AFTER the cutoff."""
    target = datetime(2026, 1, 15, 12, 0, 0, tzinfo=UTC)
    return pd.DataFrame([
        {"startTime": target, "publishTime": datetime(2026, 1, 14, 10, 0, 0, tzinfo=UTC), "generation": 5000},
        {"startTime": target, "publishTime": datetime(2026, 1, 14, 15, 0, 0, tzinfo=UTC), "generation": 5500},
    ])


@pytest.fixture
def hand_computed_example() -> tuple[pd.DataFrame, pd.DataFrame, dict]:
    """
    Small hand-computed example for verifying metrics.

    3 hours with known forecast, actual, and error values:
      Hour 0:  forecast=100, actual=120, error=-20
      Hour 1:  forecast=200, actual=180, error=+20
      Hour 2:  forecast=300, actual=250, error=+50

    Hand-computed metrics:
      errors = [-20, 20, 50]
      abs_errors = [20, 20, 50]
      MAE  = (20+20+50)/3 = 30.0
      RMSE = sqrt((400+400+2500)/3) = sqrt(1100) = 33.166...
      Bias = (-20+20+50)/3 = 16.666...
      MAPE = (20/120 + 20/180 + 50/250) / 3 * 100
           = (0.1667 + 0.1111 + 0.2) / 3 * 100
           = 0.4778 / 3 * 100 = 15.926...
      P95  = 95th percentile of [20, 20, 50]
           = 20 + 0.95*(50-20) * ... (numpy linear interp)
    """
    delivery = date(2026, 1, 15)

    # Forecasts
    fc_rows = [
        {"start_time": datetime(2026, 1, 15, 0, 0, 0, tzinfo=UTC), "forecast_mw": 100.0, "publish_time": datetime(2026, 1, 14, 7, 30, 0, tzinfo=UTC), "forecast_missing": False},
        {"start_time": datetime(2026, 1, 15, 1, 0, 0, tzinfo=UTC), "forecast_mw": 200.0, "publish_time": datetime(2026, 1, 14, 7, 30, 0, tzinfo=UTC), "forecast_missing": False},
        {"start_time": datetime(2026, 1, 15, 2, 0, 0, tzinfo=UTC), "forecast_mw": 300.0, "publish_time": datetime(2026, 1, 14, 7, 30, 0, tzinfo=UTC), "forecast_missing": False},
    ]

    # Actuals
    act_rows = [
        {"start_time": datetime(2026, 1, 15, 0, 0, 0, tzinfo=UTC), "actual_mw": 120.0, "hh1_mw": 110.0, "hh2_mw": 130.0},
        {"start_time": datetime(2026, 1, 15, 1, 0, 0, tzinfo=UTC), "actual_mw": 180.0, "hh1_mw": 170.0, "hh2_mw": 190.0},
        {"start_time": datetime(2026, 1, 15, 2, 0, 0, tzinfo=UTC), "actual_mw": 250.0, "hh1_mw": 240.0, "hh2_mw": 260.0},
    ]

    expected = {
        "mae": 30.0,
        "rmse_approx": 33.17,  # sqrt(1100/3) = 33.166...
        "bias_approx": 16.67,  # 50/3 = 16.666...
        "mape_approx": 15.93,
    }

    return pd.DataFrame(fc_rows), pd.DataFrame(act_rows), expected
