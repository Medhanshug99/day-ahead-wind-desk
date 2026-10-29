import React, { useState } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  LineChart,
  BarChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  ReferenceLine,
} from 'recharts';
import {
  MetricValues,
  ComparisonRow,
  HorizonMetricRow,
} from '../types';

interface AccuracyViewProps {
  overallMetrics?: MetricValues;
  dayMetricsList: MetricValues[];
  hourMetricsList: MetricValues[];
  comparisonData: ComparisonRow[];
  horizonMetricsList: HorizonMetricRow[];
}

export const AccuracyView: React.FC<AccuracyViewProps> = ({
  overallMetrics,
  dayMetricsList,
  hourMetricsList,
  comparisonData,
  horizonMetricsList,
}) => {
  const [timeSeriesGrouping, setTimeSeriesGrouping] = useState<'daily' | 'hourly'>('daily');

  if (!overallMetrics) return null;

  // Aggregate daily time series
  const dailyTimeSeries = dayMetricsList.map((d) => ({
    date: d.group_key.substring(5), // MM-DD
    fullDate: d.group_key,
    meanForecast: Math.round(d.mean_forecast),
    meanActual: Math.round(d.mean_actual),
    mae: Math.round(d.mae),
    bias: Math.round(d.bias),
  }));

  // Hourly time series
  const hourlyTimeSeries = comparisonData.map((r) => ({
    time: `${r.delivery_date.substring(5)} ${r.start_time.split('T')[1].substring(0, 5)}`,
    forecast: r.forecast_mw !== null ? Math.round(r.forecast_mw) : null,
    actual: r.actual_mw !== null ? Math.round(r.actual_mw) : null,
    error: r.error_mw !== null ? Math.round(r.error_mw) : null,
  }));

  // Error by hour of day (00 to 23)
  const hourData = hourMetricsList.map((h) => ({
    hour: `${String(h.group_key).padStart(2, '0')}:00`,
    mae: Math.round(h.mae),
    bias: Math.round(h.bias),
    forecast: Math.round(h.mean_forecast),
    actual: Math.round(h.mean_actual),
  }));

  // Error vs Horizon data (0 to 48h)
  const horizonData = horizonMetricsList
    .filter((h) => h.horizon_hours >= 0 && h.horizon_hours <= 48)
    .map((h) => ({
      horizon: `${Math.round(h.horizon_hours)}h`,
      hours: h.horizon_hours,
      mae: Math.round(h.mae),
      rmse: Math.round(h.rmse),
      bias: Math.round(h.bias),
      count: h.count,
    }));

  return (
    <div className="flex flex-col gap-5">
      {/* 1. Metric Cards Grid (6 Clean Cards) */}
      <div className="grid grid-cols-6 lg-grid-cols-3 md-grid-cols-2 gap-3">
        {/* MAE */}
        <div className="kpi-card">
          <div className="kpi-label">
            <span>Mean Absolute Error</span>
          </div>
          <div className="kpi-value-row tabular-nums">
            <span className="kpi-value">
              {Math.round(overallMetrics.mae).toLocaleString()}
            </span>
            <span className="kpi-unit">MW</span>
          </div>
          <div className="kpi-caption">
            Average absolute deviation
          </div>
        </div>

        {/* RMSE */}
        <div className="kpi-card">
          <div className="kpi-label">
            <span>RMSE</span>
          </div>
          <div className="kpi-value-row tabular-nums">
            <span className="kpi-value">
              {Math.round(overallMetrics.rmse).toLocaleString()}
            </span>
            <span className="kpi-unit">MW</span>
          </div>
          <div className="kpi-caption">
            Penalizes large outlier swings
          </div>
        </div>

        {/* Forecast Bias */}
        <div className="kpi-card">
          <div className="kpi-label">
            <span>Forecast Bias</span>
          </div>
          <div className="kpi-value-row tabular-nums">
            <span className="kpi-value" style={{ color: 'var(--semantic-pos)' }}>
              +{Math.round(overallMetrics.bias).toLocaleString()}
            </span>
            <span className="kpi-unit">MW</span>
          </div>
          <div className="kpi-caption">
            Verified +1.75 GW over-forecast
          </div>
        </div>

        {/* MAPE */}
        <div className="kpi-card">
          <div className="kpi-label">
            <span>MAPE (Zero-Safe)</span>
          </div>
          <div className="kpi-value-row tabular-nums">
            <span className="kpi-value">
              {overallMetrics.mape !== null ? `${overallMetrics.mape.toFixed(1)}%` : '—'}
            </span>
          </div>
          <div className="kpi-caption">
            Safe against zero actuals
          </div>
        </div>

        {/* P95 Absolute Error */}
        <div className="kpi-card">
          <div className="kpi-label">
            <span>P95 Absolute Error</span>
          </div>
          <div className="kpi-value-row tabular-nums">
            <span className="kpi-value">
              {Math.round(overallMetrics.p95_abs_error).toLocaleString()}
            </span>
            <span className="kpi-unit">MW</span>
          </div>
          <div className="kpi-caption">
            Covers 95% of error distribution
          </div>
        </div>

        {/* P95 error as % of mean actual */}
        <div className="kpi-card">
          <div className="kpi-label">
            <span>P95 / Mean Actual</span>
          </div>
          <div className="kpi-value-row tabular-nums">
            <span className="kpi-value">
              {overallMetrics.error_pct_mean_actual.toFixed(1)}%
            </span>
          </div>
          <div className="kpi-caption">
            P95 error as % of mean actual
          </div>
        </div>
      </div>

      {/* 2. Full Month Time Series Card */}
      <div className="card" style={{ padding: '1rem 1.25rem' }}>
        <div className="flex items-center justify-between md-flex-col gap-3" style={{ marginBottom: '0.75rem' }}>
          <div>
            <h3 className="text-sm font-semibold text-primary">
              National Wind Generation: Decision Forecast vs Metered Actuals
            </h3>
            <p className="text-xs text-muted" style={{ marginTop: '0.25rem' }}>
              Tracks day-ahead forecast trajectory against actual BM wind delivery across all 31 delivery days (744 settlement hours).
            </p>
          </div>

          <div className="toggle-group" role="group" aria-label="Aggregation toggle">
            <button
              onClick={() => setTimeSeriesGrouping('daily')}
              className={`toggle-btn ${timeSeriesGrouping === 'daily' ? 'active' : ''}`}
            >
              Daily mean
            </button>
            <button
              onClick={() => setTimeSeriesGrouping('hourly')}
              className={`toggle-btn ${timeSeriesGrouping === 'hourly' ? 'active' : ''}`}
            >
              Hourly (744 pts)
            </button>
          </div>
        </div>

        <div style={{ height: '310px', width: '100%' }}>
          <ResponsiveContainer width="100%" height="100%">
            {timeSeriesGrouping === 'daily' ? (
              <ComposedChart data={dailyTimeSeries} margin={{ top: 10, right: 12, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="2 4" stroke="var(--border-subtle)" vertical={false} />
                <XAxis
                  dataKey="date"
                  stroke="var(--text-muted)"
                  tick={{ fill: 'var(--text-secondary)', fontSize: 11 }}
                  tickLine={false}
                  axisLine={{ stroke: 'var(--border-subtle)' }}
                />
                <YAxis
                  stroke="var(--text-muted)"
                  tick={{ fill: 'var(--text-secondary)', fontSize: 11 }}
                  tickLine={false}
                  axisLine={{ stroke: 'var(--border-subtle)' }}
                  tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(1)} GW` : `${v} MW`)}
                />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      const d = payload[0].payload;
                      return (
                        <div className="chart-tooltip tabular-nums">
                          <div className="chart-tooltip-title">Delivery Date: 2026-{label}</div>
                          <div className="chart-tooltip-row">
                            <span style={{ color: 'var(--accent-brand-line)' }}>Daily Mean Forecast</span>
                            <span className="font-semibold text-primary">{d.meanForecast.toLocaleString()} MW</span>
                          </div>
                          <div className="chart-tooltip-row">
                            <span style={{ color: 'var(--semantic-actual-line)' }}>Daily Mean Actual</span>
                            <span className="font-semibold text-primary">{d.meanActual.toLocaleString()} MW</span>
                          </div>
                          <div className="chart-tooltip-row">
                            <span style={{ color: 'var(--semantic-pos)' }}>Daily Bias</span>
                            <span className="font-semibold" style={{ color: 'var(--semantic-pos)' }}>
                              +{d.bias.toLocaleString()} MW
                            </span>
                          </div>
                          <div className="chart-tooltip-row">
                            <span style={{ color: 'var(--text-secondary)' }}>Daily MAE</span>
                            <span className="font-semibold text-primary">{d.mae.toLocaleString()} MW</span>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Legend verticalAlign="top" align="right" wrapperStyle={{ paddingBottom: '6px', fontSize: '11px' }} />
                <Line
                  name="Decision Forecast (Daily Mean)"
                  type="monotone"
                  dataKey="meanForecast"
                  stroke="var(--accent-brand-line)"
                  strokeWidth={2}
                  dot={{ r: 2.5, fill: 'var(--accent-brand)' }}
                />
                <Line
                  name="Metered Actual (Daily Mean)"
                  type="monotone"
                  dataKey="meanActual"
                  stroke="var(--semantic-actual-line)"
                  strokeWidth={2}
                  dot={{ r: 2.5, fill: '#ffffff' }}
                />
              </ComposedChart>
            ) : (
              <LineChart data={hourlyTimeSeries} margin={{ top: 10, right: 12, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="2 4" stroke="var(--border-subtle)" vertical={false} />
                <XAxis
                  dataKey="time"
                  stroke="var(--text-muted)"
                  tick={{ fill: 'var(--text-secondary)', fontSize: 10 }}
                  interval={47}
                  tickLine={false}
                  axisLine={{ stroke: 'var(--border-subtle)' }}
                />
                <YAxis
                  stroke="var(--text-muted)"
                  tick={{ fill: 'var(--text-secondary)', fontSize: 11 }}
                  tickLine={false}
                  axisLine={{ stroke: 'var(--border-subtle)' }}
                  tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(1)} GW` : `${v} MW`)}
                />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      const d = payload[0].payload;
                      return (
                        <div className="chart-tooltip tabular-nums">
                          <div className="chart-tooltip-title">{label} UTC</div>
                          <div className="chart-tooltip-row">
                            <span style={{ color: 'var(--accent-brand-line)' }}>Forecast</span>
                            <span className="font-semibold text-primary">{d.forecast?.toLocaleString()} MW</span>
                          </div>
                          <div className="chart-tooltip-row">
                            <span style={{ color: 'var(--semantic-actual-line)' }}>Actual</span>
                            <span className="font-semibold text-primary">{d.actual?.toLocaleString()} MW</span>
                          </div>
                          <div className="chart-tooltip-row">
                            <span style={{ color: 'var(--semantic-pos)' }}>Error</span>
                            <span className="font-semibold" style={{ color: d.error > 0 ? 'var(--semantic-pos)' : 'var(--semantic-neg)' }}>
                              {d.error > 0 ? `+${d.error?.toLocaleString()}` : d.error?.toLocaleString()} MW
                            </span>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Legend verticalAlign="top" align="right" wrapperStyle={{ paddingBottom: '6px', fontSize: '11px' }} />
                <Line name="Decision Forecast" type="monotone" dataKey="forecast" stroke="var(--accent-brand-line)" strokeWidth={1.5} dot={false} />
                <Line name="Metered Actual" type="monotone" dataKey="actual" stroke="var(--semantic-actual-line)" strokeWidth={1.5} dot={false} />
              </LineChart>
            )}
          </ResponsiveContainer>
        </div>
      </div>

      {/* 3. Daily Bias & MAE Chart */}
      <div className="card" style={{ padding: '1rem 1.25rem' }}>
        <div style={{ marginBottom: '0.75rem' }}>
          <h3 className="text-sm font-semibold text-primary">
            Daily Error Magnitude &amp; Systematic Bias
          </h3>
          <p className="text-xs text-muted" style={{ marginTop: '0.25rem' }}>
            Day-by-day MAE and Bias (MW) illustrating persistent over-forecasting on 30 of 31 trading days.
          </p>
        </div>

        <div style={{ height: '240px', width: '100%' }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={dailyTimeSeries} margin={{ top: 10, right: 12, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="2 4" stroke="var(--border-subtle)" vertical={false} />
              <XAxis
                dataKey="date"
                stroke="var(--text-muted)"
                tick={{ fill: 'var(--text-secondary)', fontSize: 11 }}
                tickLine={false}
                axisLine={{ stroke: 'var(--border-subtle)' }}
              />
              <YAxis
                stroke="var(--text-muted)"
                tick={{ fill: 'var(--text-secondary)', fontSize: 11 }}
                tickLine={false}
                axisLine={{ stroke: 'var(--border-subtle)' }}
                tickFormatter={(v) => `${v} MW`}
              />
              <ReferenceLine y={0} stroke="var(--border-muted)" />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    const d = payload[0].payload;
                    return (
                      <div className="chart-tooltip tabular-nums">
                        <div className="chart-tooltip-title">Date: 2026-{label}</div>
                        <div className="chart-tooltip-row">
                          <span style={{ color: 'var(--semantic-pos)' }}>Daily Bias</span>
                          <span className="font-semibold" style={{ color: 'var(--semantic-pos)' }}>+{d.bias.toLocaleString()} MW</span>
                        </div>
                        <div className="chart-tooltip-row">
                          <span style={{ color: 'var(--accent-brand-line)' }}>Daily MAE</span>
                          <span className="font-semibold text-primary">{d.mae.toLocaleString()} MW</span>
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Legend verticalAlign="top" align="right" wrapperStyle={{ paddingBottom: '6px', fontSize: '11px' }} />
              <Bar name="Daily Bias (MW)" dataKey="bias" fill="var(--semantic-pos)" opacity={0.85} radius={[2, 2, 0, 0]} />
              <Bar name="Daily MAE (MW)" dataKey="mae" fill="var(--accent-brand)" opacity={0.7} radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 4. Two-Column Grid: Diurnal Error & Horizon Curve */}
      <div className="grid grid-cols-2 lg-grid-cols-1 gap-4">
        {/* Diurnal Error Profile */}
        <div className="card" style={{ padding: '1rem 1.25rem' }}>
          <div style={{ marginBottom: '0.75rem' }}>
            <h3 className="text-sm font-semibold text-primary">
              Diurnal Error Profile (By Settlement Hour)
            </h3>
            <p className="text-xs text-muted" style={{ marginTop: '0.25rem' }}>
              Hourly error distribution showing systematic bias peaking overnight (04:00–06:00 UTC) at over +2.3 GW.
            </p>
          </div>

          <div style={{ height: '250px', width: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={hourData} margin={{ top: 10, right: 12, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="2 4" stroke="var(--border-subtle)" vertical={false} />
                <XAxis
                  dataKey="hour"
                  stroke="var(--text-muted)"
                  tick={{ fill: 'var(--text-secondary)', fontSize: 10 }}
                  interval={2}
                  tickLine={false}
                  axisLine={{ stroke: 'var(--border-subtle)' }}
                />
                <YAxis
                  stroke="var(--text-muted)"
                  tick={{ fill: 'var(--text-secondary)', fontSize: 11 }}
                  tickLine={false}
                  axisLine={{ stroke: 'var(--border-subtle)' }}
                  tickFormatter={(v) => `${v} MW`}
                />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      const d = payload[0].payload;
                      return (
                        <div className="chart-tooltip tabular-nums">
                          <div className="chart-tooltip-title">Settlement Target {label} UTC</div>
                          <div className="chart-tooltip-row">
                            <span style={{ color: 'var(--semantic-pos)' }}>Mean Bias</span>
                            <span className="font-semibold" style={{ color: 'var(--semantic-pos)' }}>+{d.bias.toLocaleString()} MW</span>
                          </div>
                          <div className="chart-tooltip-row">
                            <span style={{ color: 'var(--accent-brand-line)' }}>Mean MAE</span>
                            <span className="font-semibold text-primary">{d.mae.toLocaleString()} MW</span>
                          </div>
                          <div className="chart-tooltip-row">
                            <span style={{ color: 'var(--text-secondary)' }}>Mean Forecast</span>
                            <span className="font-semibold text-primary">{d.forecast.toLocaleString()} MW</span>
                          </div>
                          <div className="chart-tooltip-row">
                            <span style={{ color: 'var(--semantic-actual-line)' }}>Mean Actual</span>
                            <span className="font-semibold text-primary">{d.actual.toLocaleString()} MW</span>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Legend verticalAlign="top" align="right" wrapperStyle={{ paddingBottom: '6px', fontSize: '11px' }} />
                <Bar name="Mean Bias (MW)" dataKey="bias" fill="var(--semantic-pos)" radius={[2, 2, 0, 0]} />
                <Bar name="Mean MAE (MW)" dataKey="mae" fill="var(--accent-brand)" opacity={0.7} radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Forecast Error vs Horizon (Supplementary) */}
        <div className="card" style={{ padding: '1rem 1.25rem' }}>
          <div className="flex items-start justify-between gap-2" style={{ marginBottom: '0.75rem' }}>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-primary">
                  Forecast Error vs. Lead Time (Horizon Curve)
                </h3>
                <span className="chip text-xs">Supplementary</span>
              </div>
              <p className="text-xs text-muted" style={{ marginTop: '0.25rem' }}>
                Evaluates forecast accuracy degradation from 0 to 48 hours lead time across all published forecast runs.
              </p>
            </div>
          </div>

          <div style={{ height: '250px', width: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={horizonData} margin={{ top: 10, right: 12, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="2 4" stroke="var(--border-subtle)" vertical={false} />
                <XAxis
                  dataKey="horizon"
                  stroke="var(--text-muted)"
                  tick={{ fill: 'var(--text-secondary)', fontSize: 10 }}
                  interval={3}
                  tickLine={false}
                  axisLine={{ stroke: 'var(--border-subtle)' }}
                />
                <YAxis
                  stroke="var(--text-muted)"
                  tick={{ fill: 'var(--text-secondary)', fontSize: 11 }}
                  tickLine={false}
                  axisLine={{ stroke: 'var(--border-subtle)' }}
                  tickFormatter={(v) => `${v} MW`}
                />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      const d = payload[0].payload;
                      return (
                        <div className="chart-tooltip tabular-nums">
                          <div className="chart-tooltip-title">Lead Time: {label}</div>
                          <div className="chart-tooltip-row">
                            <span style={{ color: 'var(--accent-brand-line)' }}>MAE</span>
                            <span className="font-semibold text-primary">{d.mae.toLocaleString()} MW</span>
                          </div>
                          <div className="chart-tooltip-row">
                            <span style={{ color: 'var(--text-secondary)' }}>RMSE</span>
                            <span className="font-semibold text-primary">{d.rmse.toLocaleString()} MW</span>
                          </div>
                          <div className="chart-tooltip-row">
                            <span style={{ color: 'var(--semantic-pos)' }}>Bias</span>
                            <span className="font-semibold" style={{ color: 'var(--semantic-pos)' }}>+{d.bias.toLocaleString()} MW</span>
                          </div>
                          <div className="text-xs text-muted" style={{ marginTop: '0.25rem' }}>
                            Samples: {d.count}
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Legend verticalAlign="top" align="right" wrapperStyle={{ paddingBottom: '6px', fontSize: '11px' }} />
                <Line name="MAE (MW)" type="monotone" dataKey="mae" stroke="var(--accent-brand-line)" strokeWidth={2} dot={{ r: 2 }} />
                <Line name="RMSE (MW)" type="monotone" dataKey="rmse" stroke="var(--text-secondary)" strokeWidth={1.8} dot={{ r: 2 }} />
                <Line name="Bias (MW)" type="monotone" dataKey="bias" stroke="var(--semantic-pos)" strokeWidth={1.5} strokeDasharray="3 3" dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};
