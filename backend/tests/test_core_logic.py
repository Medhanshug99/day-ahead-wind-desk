"""
Tests for core_logic.py — forecast selection, aggregation, comparison.

Required test cases:
  1. Forecast published exactly at the cutoff IS included
  2. Forecast published after the cutoff IS excluded
  3. Multiple candidates → picks the latest valid
  4. No forecast before cutoff → handled explicitly
  5. Half-hourly to hourly aggregation
  6. Timezone conversion
"""

from __future__ import annotations

from datetime import date, datetime, timezone

import numpy as np
import pandas as pd
import pytest

from app.core_logic import (
    aggregate_actuals_to_hourly,
    build_comparison,
    convert_to_london,
    get_cutoff_datetime,
    select_decision_forecasts,
)

UTC = timezone.utc


# ── Cutoff datetime ──────────────────────────────────────────────────

class TestGetCutoffDatetime:
    def test_default_cutoff(self):
        dt = get_cutoff_datetime(date(2026, 1, 15))
        assert dt == datetime(2026, 1, 14, 9, 0, 0, tzinfo=UTC)

    def test_custom_cutoff(self):
        dt = get_cutoff_datetime(date(2026, 1, 15), cutoff_hour=11)
        assert dt == datetime(2026, 1, 14, 11, 0, 0, tzinfo=UTC)

    def test_cutoff_is_d_minus_1(self):
        """Cutoff is always on the day BEFORE the delivery date."""
        dt = get_cutoff_datetime(date(2026, 1, 2), cutoff_hour=9)
        assert dt.date() == date(2026, 1, 1)


# ── Forecast selection ───────────────────────────────────────────────

class TestSelectDecisionForecasts:
    def test_exactly_at_cutoff_is_included(self, sample_forecasts):
        """Req 1: publishTime == cutoff is INCLUDED (<=, not <)."""
        result = select_decision_forecasts(
            sample_forecasts, date(2026, 1, 15), cutoff_hour=9,
        )
        row_12 = result[result["start_time"] == datetime(2026, 1, 15, 12, 0, 0, tzinfo=UTC)]
        assert len(row_12) == 1
        r = row_12.iloc[0]
        # Forecast C (published exactly at 09:00) should be selected
        assert r["forecast_mw"] == 11000
        assert r["publish_time"] == datetime(2026, 1, 14, 9, 0, 0, tzinfo=UTC)
        assert r["forecast_missing"] == False

    def test_after_cutoff_is_excluded(self, sample_forecasts):
        """Req 2: publishTime > cutoff is EXCLUDED."""
        result = select_decision_forecasts(
            sample_forecasts, date(2026, 1, 15), cutoff_hour=9,
        )
        row_12 = result[result["start_time"] == datetime(2026, 1, 15, 12, 0, 0, tzinfo=UTC)].iloc[0]
        # Should NOT be 11500 (published 09:30) or 12000 (published next day)
        assert row_12["forecast_mw"] != 11500
        assert row_12["forecast_mw"] != 12000

    def test_picks_latest_valid(self, sample_forecasts):
        """Req 3: among multiple eligible, picks the one with latest publishTime."""
        result = select_decision_forecasts(
            sample_forecasts, date(2026, 1, 15), cutoff_hour=9,
        )
        row_12 = result[result["start_time"] == datetime(2026, 1, 15, 12, 0, 0, tzinfo=UTC)].iloc[0]
        # Eligible: A(04:30 → 10000), B(07:30 → 10500), C(09:00 → 11000)
        # Latest eligible = C at 09:00
        assert row_12["forecast_mw"] == 11000

    def test_no_forecast_before_cutoff(self, no_forecast_before_cutoff):
        """Req 4: when no forecast published before cutoff, mark as missing."""
        result = select_decision_forecasts(
            no_forecast_before_cutoff, date(2026, 1, 15), cutoff_hour=9,
        )
        row_12 = result[result["start_time"] == datetime(2026, 1, 15, 12, 0, 0, tzinfo=UTC)].iloc[0]
        assert row_12["forecast_missing"] == True
        assert row_12["forecast_mw"] is None
        assert row_12["publish_time"] is None

    def test_returns_24_rows(self, sample_forecasts):
        """Always returns exactly 24 rows (one per hour 00-23)."""
        result = select_decision_forecasts(
            sample_forecasts, date(2026, 1, 15), cutoff_hour=9,
        )
        assert len(result) == 24

    def test_missing_hours_flagged(self, sample_forecasts):
        """Hours with no forecast data are flagged as missing."""
        result = select_decision_forecasts(
            sample_forecasts, date(2026, 1, 15), cutoff_hour=9,
        )
        # We only provided forecasts for hours 0, 6, 12, 18, 23
        # The remaining 19 hours should be missing
        missing = result[result["forecast_missing"]]
        present = result[~result["forecast_missing"]]
        assert len(present) == 5  # hours 0, 6, 12, 18, 23
        assert len(missing) == 19

    def test_different_cutoff_changes_selection(self, sample_forecasts):
        """With cutoff=7, the 07:30 and 09:00 forecasts should be excluded."""
        result = select_decision_forecasts(
            sample_forecasts, date(2026, 1, 15), cutoff_hour=7,
        )
        row_12 = result[result["start_time"] == datetime(2026, 1, 15, 12, 0, 0, tzinfo=UTC)].iloc[0]
        # Only A (04:30 → 10000) is eligible with cutoff at 07:00
        assert row_12["forecast_mw"] == 10000


# ── Half-hourly aggregation ──────────────────────────────────────────

class TestAggregateActualsToHourly:
    def test_aggregation_produces_24_hours(self, sample_actuals):
        """Req 5: 48 half-hourly values → 24 hourly means."""
        result = aggregate_actuals_to_hourly(sample_actuals, date(2026, 1, 15))
        assert len(result) == 24

    def test_hourly_mean_is_correct(self, sample_actuals):
        """Verify the mean of two half-hourly values."""
        result = aggregate_actuals_to_hourly(sample_actuals, date(2026, 1, 15))
        # Hour 0: SP1=10050, SP2=10100 → mean=10075
        hour_0 = result[result["start_time"] == datetime(2026, 1, 15, 0, 0, 0, tzinfo=UTC)].iloc[0]
        assert hour_0["actual_mw"] == pytest.approx(10075.0)
        assert hour_0["hh1_mw"] == pytest.approx(10050.0)
        assert hour_0["hh2_mw"] == pytest.approx(10100.0)

    def test_preserves_individual_halves(self, sample_actuals):
        """Both hh1_mw and hh2_mw are preserved for API response."""
        result = aggregate_actuals_to_hourly(sample_actuals, date(2026, 1, 15))
        assert "hh1_mw" in result.columns
        assert "hh2_mw" in result.columns

    def test_empty_dataframe(self):
        """Handles empty input gracefully."""
        empty = pd.DataFrame(columns=["startTime", "generation", "settlementDate"])
        result = aggregate_actuals_to_hourly(empty, date(2026, 1, 15))
        assert len(result) == 0


# ── Comparison builder ───────────────────────────────────────────────

class TestBuildComparison:
    def test_error_is_forecast_minus_actual(self, hand_computed_example):
        """error = forecast - actual (positive = overestimate)."""
        fc_df, act_df, _ = hand_computed_example
        result = build_comparison(fc_df, act_df)
        # Hour 0: forecast=100, actual=120, error=-20
        row0 = result.iloc[0]
        assert row0["error_mw"] == pytest.approx(-20.0)
        # Hour 2: forecast=300, actual=250, error=+50
        row2 = result.iloc[2]
        assert row2["error_mw"] == pytest.approx(50.0)

    def test_missing_forecast_has_nan_error(self, hand_computed_example):
        """When forecast is missing, error should be NaN."""
        fc_df, act_df, _ = hand_computed_example
        # Mark first row as missing
        fc_df = fc_df.copy()
        fc_df.loc[0, "forecast_missing"] = True
        fc_df.loc[0, "forecast_mw"] = None
        result = build_comparison(fc_df, act_df)
        assert np.isnan(result.iloc[0]["error_mw"])


# ── Timezone conversion ─────────────────────────────────────────────

class TestTimezoneConversion:
    def test_january_utc_equals_london(self):
        """Req 7: In January (GMT), UTC == London time."""
        dt = datetime(2026, 1, 15, 9, 0, 0, tzinfo=UTC)
        london = convert_to_london(dt)
        assert "2026-01-15T09:00:00+00:00" == london

    def test_summer_bst_offset(self):
        """In summer (BST), London is UTC+1."""
        dt = datetime(2026, 7, 15, 9, 0, 0, tzinfo=UTC)
        london = convert_to_london(dt)
        assert "2026-07-15T10:00:00+01:00" == london

    def test_handles_pandas_timestamp(self):
        """Works with pd.Timestamp as well as datetime."""
        ts = pd.Timestamp("2026-01-15 12:00:00", tz="UTC")
        london = convert_to_london(ts)
        assert "2026-01-15T12:00:00+00:00" == london

    def test_naive_datetime_treated_as_utc(self):
        """Naive datetimes are assumed UTC."""
        dt = datetime(2026, 1, 15, 9, 0, 0)
        london = convert_to_london(dt)
        assert "+00:00" in london
