"""Pydantic response models for all API endpoints."""
from datetime import date, datetime
from typing import Optional

from pydantic import BaseModel


# --- Shared sub-models ---

class HalfHourlyActual(BaseModel):
    start_time: datetime
    settlement_period: int
    generation_mw: float


class HourlyRow(BaseModel):
    """One hourly slot in a decision or comparison response."""
    start_time: datetime
    start_time_local: str  # Europe/London ISO string
    forecast_mw: Optional[float] = None
    publish_time: Optional[datetime] = None
    actual_mw: Optional[float] = None
    actual_hh1_mw: Optional[float] = None  # first half-hour (HH:00)
    actual_hh2_mw: Optional[float] = None  # second half-hour (HH:30)
    error_mw: Optional[float] = None
    forecast_missing: bool = False
    actual_missing: bool = False


class CoverageInfo(BaseModel):
    total_hours: int
    forecast_present: int
    actual_present: int
    matched: int


# --- Endpoint responses ---

class DecisionResponse(BaseModel):
    delivery_date: date
    decision_date: date
    cutoff_utc: datetime
    cutoff_local: str
    hourly_data: list[HourlyRow]
    half_hourly_actuals: list[HalfHourlyActual]
    coverage: CoverageInfo


class ComparisonRow(BaseModel):
    delivery_date: date
    start_time: datetime
    start_time_local: str
    forecast_mw: Optional[float] = None
    actual_mw: Optional[float] = None
    error_mw: Optional[float] = None
    publish_time: Optional[datetime] = None


class ComparisonResponse(BaseModel):
    start: date
    end: date
    data: list[ComparisonRow]
    coverage: CoverageInfo


class MetricValues(BaseModel):
    group_key: str
    mae: float
    rmse: float
    bias: float
    mape: Optional[float] = None
    p95_abs_error: float
    error_pct_mean_actual: Optional[float] = None
    count: int
    mean_actual: float
    mean_forecast: float


class MetricsResponse(BaseModel):
    start: date
    end: date
    group_by: str
    metrics: list[MetricValues]


class HorizonMetricRow(BaseModel):
    horizon_hours: float
    mae: float
    rmse: float
    bias: float
    mape: Optional[float] = None
    count: int


class HorizonMetricsResponse(BaseModel):
    description: str
    note: str
    data: list[HorizonMetricRow]


class HealthResponse(BaseModel):
    status: str
    data_loaded: bool
    fuelhh_records: int
    windfor_records: int
    delivery_window: str
    cutoff_hour: int
    windfor_publish_schedule: list[str]
