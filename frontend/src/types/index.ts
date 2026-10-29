export interface HourlyRow {
  start_time: string;
  start_time_local: string;
  forecast_mw: number | null;
  publish_time: string | null;
  actual_mw: number | null;
  actual_hh1_mw?: number | null;
  actual_hh2_mw?: number | null;
  error_mw: number | null;
  forecast_missing: boolean;
  actual_missing: boolean;
}

export interface HalfHourlyActual {
  start_time: string;
  settlement_period: number;
  generation_mw: number;
}

export interface CoverageInfo {
  total_hours: number;
  forecast_present: number;
  actual_present: number;
  matched: number;
}

export interface DecisionResponse {
  delivery_date: string;
  decision_date: string;
  cutoff_utc: string;
  cutoff_local: string;
  hourly_data: HourlyRow[];
  half_hourly_actuals: HalfHourlyActual[];
  coverage: CoverageInfo;
}

export interface ComparisonRow {
  delivery_date: string;
  start_time: string;
  start_time_local: string;
  forecast_mw: number;
  actual_mw: number;
  error_mw: number;
  publish_time: string;
}

export interface ComparisonResponse {
  start: string;
  end: string;
  data: ComparisonRow[];
  coverage: CoverageInfo;
}

export interface MetricValues {
  group_key: string;
  mae: number;
  rmse: number;
  bias: number;
  mape: number | null;
  p95_abs_error: number;
  error_pct_mean_actual: number;
  count: number;
  mean_actual: number;
  mean_forecast: number;
}

export interface MetricsResponse {
  start: string;
  end: string;
  group_by: 'overall' | 'day' | 'hour';
  metrics: MetricValues[];
}

export interface HorizonMetricRow {
  horizon_hours: number;
  mae: number;
  rmse: number;
  bias: number;
  mape: number | null;
  count: number;
}

export interface HorizonMetricsResponse {
  description: string;
  note: string;
  data: HorizonMetricRow[];
}

export interface HealthResponse {
  status: string;
  data_loaded: boolean;
  fuelhh_records: number;
  windfor_records: number;
  delivery_window: string;
  cutoff_hour: number;
  windfor_publish_schedule: string[];
}

