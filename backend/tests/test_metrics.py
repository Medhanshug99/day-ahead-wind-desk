"""
Tests for metrics.py — accuracy metrics computation.

Required test cases:
  6. MAPE with zero actuals
  8. Metrics against a hand-computed example
  Plus: grouping by day/hour, edge cases
"""

from __future__ import annotations

from datetime import date, datetime, timezone

import numpy as np
import pandas as pd
import pytest

from app.core_logic import build_comparison
from app.metrics import _safe_mape, compute_metrics

UTC = timezone.utc


class TestSafeMape:
    def test_all_zero_actuals(self):
        """Req 6: MAPE returns None when all actuals are zero."""
        errors = np.array([10.0, 20.0, 30.0])
        actuals = np.array([0.0, 0.0, 0.0])
        assert _safe_mape(errors, actuals) is None

    def test_some_zero_actuals(self):
        """Zero-actual rows are excluded from MAPE calculation."""
        errors = np.array([10.0, 20.0])
        actuals = np.array([0.0, 100.0])
        # Only 2nd row: |20/100| * 100 = 20%
        assert _safe_mape(errors, actuals) == pytest.approx(20.0)

    def test_normal_mape(self):
        errors = np.array([10.0, 20.0])
        actuals = np.array([100.0, 200.0])
        # (|10/100| + |20/200|) / 2 * 100 = (0.1 + 0.1) / 2 * 100 = 10%
        assert _safe_mape(errors, actuals) == pytest.approx(10.0)


class TestComputeMetrics:
    def test_hand_computed_overall(self, hand_computed_example):
        """Req 8: verify against hand-computed values."""
        fc_df, act_df, expected = hand_computed_example
        comp = build_comparison(fc_df, act_df)
        comp["delivery_date"] = date(2026, 1, 15)

        results = compute_metrics(comp, group_by="overall")
        assert len(results) == 1
        m = results[0]

        assert m["mae"] == pytest.approx(expected["mae"], abs=0.01)
        assert m["rmse"] == pytest.approx(expected["rmse_approx"], abs=0.01)
        assert m["bias"] == pytest.approx(expected["bias_approx"], abs=0.01)
        assert m["mape"] == pytest.approx(expected["mape_approx"], abs=0.01)
        assert m["count"] == 3

    def test_hand_computed_mae(self, hand_computed_example):
        """MAE = mean(|errors|) = (20+20+50)/3 = 30."""
        fc_df, act_df, _ = hand_computed_example
        comp = build_comparison(fc_df, act_df)
        comp["delivery_date"] = date(2026, 1, 15)
        m = compute_metrics(comp, "overall")[0]
        assert m["mae"] == pytest.approx(30.0)

    def test_hand_computed_bias(self, hand_computed_example):
        """Bias = mean(errors) = (-20+20+50)/3 = 16.67."""
        fc_df, act_df, _ = hand_computed_example
        comp = build_comparison(fc_df, act_df)
        comp["delivery_date"] = date(2026, 1, 15)
        m = compute_metrics(comp, "overall")[0]
        assert m["bias"] == pytest.approx(50 / 3, abs=0.01)

    def test_p95_absolute_error(self, hand_computed_example):
        """P95 of [20, 20, 50]."""
        fc_df, act_df, _ = hand_computed_example
        comp = build_comparison(fc_df, act_df)
        comp["delivery_date"] = date(2026, 1, 15)
        m = compute_metrics(comp, "overall")[0]
        expected_p95 = np.percentile([20, 20, 50], 95)
        assert m["p95_abs_error"] == pytest.approx(expected_p95, abs=0.01)

    def test_group_by_hour(self, hand_computed_example):
        """Grouping by hour produces one metric set per hour."""
        fc_df, act_df, _ = hand_computed_example
        comp = build_comparison(fc_df, act_df)
        comp["delivery_date"] = date(2026, 1, 15)
        results = compute_metrics(comp, "hour")
        # 3 hours: 0, 1, 2
        assert len(results) == 3
        # Each group has count=1
        for m in results:
            assert m["count"] == 1

    def test_group_by_day(self):
        """Grouping by day splits results per delivery date."""
        rows = []
        for d in (date(2026, 1, 15), date(2026, 1, 16)):
            for h in range(3):
                rows.append({
                    "start_time": datetime(d.year, d.month, d.day, h, 0, 0, tzinfo=UTC),
                    "forecast_mw": 100.0,
                    "actual_mw": 120.0,
                    "error_mw": -20.0,
                    "forecast_missing": False,
                    "actual_missing": False,
                    "delivery_date": d,
                })
        comp = pd.DataFrame(rows)
        results = compute_metrics(comp, "day")
        assert len(results) == 2

    def test_empty_comparison(self):
        """Returns empty list when there's no valid data."""
        comp = pd.DataFrame(columns=[
            "start_time", "forecast_mw", "actual_mw", "error_mw",
            "forecast_missing", "actual_missing", "delivery_date",
        ])
        assert compute_metrics(comp, "overall") == []

    def test_mape_with_zero_actuals(self, sample_actuals_with_zero):
        """Req 6: MAPE computation excludes zero-actual rows."""
        from app.core_logic import aggregate_actuals_to_hourly
        hourly = aggregate_actuals_to_hourly(sample_actuals_with_zero, date(2026, 1, 15))

        # Create matching forecasts
        fc = pd.DataFrame([
            {"start_time": datetime(2026, 1, 15, 0, 0, 0, tzinfo=UTC), "forecast_mw": 100.0, "publish_time": datetime(2026, 1, 14, 7, 30, 0, tzinfo=UTC), "forecast_missing": False},
            {"start_time": datetime(2026, 1, 15, 1, 0, 0, tzinfo=UTC), "forecast_mw": 600.0, "publish_time": datetime(2026, 1, 14, 7, 30, 0, tzinfo=UTC), "forecast_missing": False},
        ])
        comp = build_comparison(fc, hourly)
        comp["delivery_date"] = date(2026, 1, 15)
        m = compute_metrics(comp, "overall")[0]

        # Hour 0: actual=0, should be excluded from MAPE
        # Hour 1: actual=500, forecast=600, error=100, |100/500|*100 = 20%
        # MAPE should be 20% (only non-zero hour)
        assert m["mape"] == pytest.approx(20.0)

    def test_error_pct_of_mean_actual(self, hand_computed_example):
        """error_pct_mean_actual = P95 / mean(actual) * 100."""
        fc_df, act_df, _ = hand_computed_example
        comp = build_comparison(fc_df, act_df)
        comp["delivery_date"] = date(2026, 1, 15)
        m = compute_metrics(comp, "overall")[0]
        mean_actual = (120 + 180 + 250) / 3  # = 183.33
        p95 = np.percentile([20, 20, 50], 95)
        expected_pct = p95 / mean_actual * 100
        assert m["error_pct_mean_actual"] == pytest.approx(expected_pct, abs=0.01)

    def test_invalid_group_by(self, hand_computed_example):
        fc_df, act_df, _ = hand_computed_example
        comp = build_comparison(fc_df, act_df)
        comp["delivery_date"] = date(2026, 1, 15)
        with pytest.raises(ValueError, match="Unknown group_by"):
            compute_metrics(comp, "invalid")
