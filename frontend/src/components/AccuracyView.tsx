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
import {
  TrendingUp,
  Activity,
  AlertTriangle,
  Percent,
  ShieldAlert,
  Clock,
  BarChart3,
  Calendar,
} from 'lucide-react';

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

  // Aggregate hourly comparison to daily for cleaner monthly trend
  const dailyTimeSeries = dayMetricsList.map((d) => ({
    date: d.group_key.substring(5), // MM-DD
    fullDate: d.group_key,
    meanForecast: d.mean_forecast,
    meanActual: d.mean_actual,
    mae: d.mae,
    bias: d.bias,
  }));

  // Hourly time series sample (downsampled or full)
  const hourlyTimeSeries = comparisonData.map((r) => ({
    time: `${r.delivery_date.substring(5)} ${r.start_time.split('T')[1].substring(0, 5)}`,
    forecast: r.forecast_mw,
    actual: r.actual_mw,
    error: r.error_mw,
  }));

  // Error by hour of day (00 to 23)
  const hourData = hourMetricsList.map((h) => ({
    hour: `${String(h.group_key).padStart(2, '0')}:00`,
    mae: h.mae,
    bias: h.bias,
    forecast: h.mean_forecast,
    actual: h.mean_actual,
  }));

  // Error vs Horizon data
  const horizonData = horizonMetricsList
    .filter((h) => h.horizon_hours >= 0 && h.horizon_hours <= 48)
    .map((h) => ({
      horizon: `${Math.round(h.horizon_hours)}h`,
      hours: h.horizon_hours,
      mae: h.mae,
      rmse: h.rmse,
      bias: h.bias,
      count: h.count,
    }));

  return (
    <div className="flex flex-col gap-6">
      {/* 1. Metric Cards Grid */}
      <div className="grid grid-cols-6 lg-grid-cols-3 md-grid-cols-2 gap-4">
        {/* MAE */}
        <div className="metric-card">
          <div className="flex items-center justify-between" style={{ marginBottom: '0.5rem' }}>
            <span className="text-xs font-semibold text-muted uppercase">MAE</span>
            <TrendingUp size={16} className="text-cyan" />
          </div>
          <div className="text-2xl font-bold font-mono text-cyan">
            {overallMetrics.mae.toLocaleString()} <span className="text-xs text-muted">MW</span>
          </div>
          <span className="text-xs text-dim block" style={{ marginTop: '0.25rem' }}>
            Mean Absolute Error
          </span>
        </div>

        {/* RMSE */}
        <div className="metric-card">
          <div className="flex items-center justify-between" style={{ marginBottom: '0.5rem' }}>
            <span className="text-xs font-semibold text-muted uppercase">RMSE</span>
            <Activity size={16} className="text-indigo" />
          </div>
          <div className="text-2xl font-bold font-mono text-slate-100">
            {overallMetrics.rmse.toLocaleString()} <span className="text-xs text-muted">MW</span>
          </div>
          <span className="text-xs text-dim block" style={{ marginTop: '0.25rem' }}>
            Root Mean Square Error
          </span>
        </div>

        {/* Bias */}
        <div className="metric-card">
          <div className="flex items-center justify-between" style={{ marginBottom: '0.5rem' }}>
            <span className="text-xs font-semibold text-muted uppercase">Forecast Bias</span>
            <AlertTriangle size={16} className="text-rose" />
          </div>
          <div className="text-2xl font-bold font-mono text-rose">
            +{overallMetrics.bias.toLocaleString()} <span className="text-xs text-muted">MW</span>
          </div>
          <span className="text-xs text-rose block" style={{ marginTop: '0.25rem' }}>
            Systematic Over-forecast
          </span>
        </div>

        {/* MAPE */}
        <div className="metric-card">
          <div className="flex items-center justify-between" style={{ marginBottom: '0.5rem' }}>
            <span className="text-xs font-semibold text-muted uppercase">MAPE</span>
            <Percent size={16} className="text-amber" />
          </div>
          <div className="text-2xl font-bold font-mono text-amber">
            {overallMetrics.mape !== null ? `${overallMetrics.mape.toFixed(1)}%` : 'N/A'}
          </div>
          <span className="text-xs text-dim block" style={{ marginTop: '0.25rem' }}>
            Zero-Safe Percentage Error
          </span>
        </div>

        {/* P95 Absolute Error */}
        <div className="metric-card">
          <div className="flex items-center justify-between" style={{ marginBottom: '0.5rem' }}>
            <span className="text-xs font-semibold text-muted uppercase">P95 Absolute Error</span>
            <ShieldAlert size={16} className="text-amber" />
          </div>
          <div className="text-2xl font-bold font-mono text-slate-100">
            {overallMetrics.p95_abs_error.toLocaleString()} <span className="text-xs text-muted">MW</span>
          </div>
          <span className="text-xs text-dim block" style={{ marginTop: '0.25rem' }}>
            95th Percentile Deviation
          </span>
        </div>

        {/* P95 error as % of mean actual */}
        <div className="metric-card">
          <div className="flex items-center justify-between" style={{ marginBottom: '0.5rem' }}>
            <span className="text-xs font-semibold text-muted uppercase">P95 / Mean Actual</span>
            <Percent size={16} className="text-emerald" />
          </div>
          <div className="text-2xl font-bold font-mono text-emerald">
            {overallMetrics.error_pct_mean_actual.toFixed(1)}%
          </div>
          <span className="text-xs text-dim block" style={{ marginTop: '0.25rem' }} title="P95 error as % of mean actual generation">
            P95 Error as % of Mean Actual
          </span>
        </div>
      </div>

      {/* 2. Full Month Forecast vs Actual Time Series */}
      <div className="card">
        <div className="flex items-center justify-between md-flex-col gap-3" style={{ marginBottom: '1rem' }}>
          <div>
            <h3 className="text-sm font-bold text-slate-100">
              National Wind: Decision Forecast vs Outturn Actuals (Full Month)
            </h3>
            <span className="text-xs text-muted">
              31 Delivery Days (744 total hours) &bull; Mean Actual: {overallMetrics.mean_actual.toLocaleString()} MW &bull; Mean Forecast: {overallMetrics.mean_forecast.toLocaleString()} MW
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setTimeSeriesGrouping('daily')}
              className={`btn-toggle ${timeSeriesGrouping === 'daily' ? 'active' : ''}`}
            >
              Daily Average
            </button>
            <button
              onClick={() => setTimeSeriesGrouping('hourly')}
              className={`btn-toggle ${timeSeriesGrouping === 'hourly' ? 'active' : ''}`}
            >
              Hourly Resolution (744 pts)
            </button>
          </div>
        </div>

        <div style={{ height: '320px', width: '100%' }}>
          <ResponsiveContainer width="100%" height="100%">
            {timeSeriesGrouping === 'daily' ? (
              <ComposedChart data={dailyTimeSeries} margin={{ top: 10, right: 20, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis dataKey="date" stroke="#64748b" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                <YAxis
                  stroke="#64748b"
                  tick={{ fill: '#94a3b8', fontSize: 11 }}
                  tickFormatter={(v) => `${(v / 1000).toFixed(1)} GW`}
                />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      const d = payload[0].payload;
                      return (
                        <div className="custom-tooltip text-xs">
                          <div className="font-bold text-slate-100" style={{ marginBottom: '4px' }}>
                            Delivery Date: {d.fullDate}
                          </div>
                          <div style={{ color: '#38bdf8' }}>
                            Mean Forecast: <span className="font-mono">{d.meanForecast.toFixed(0)} MW</span>
                          </div>
                          <div style={{ color: '#10b981' }}>
                            Mean Actual: <span className="font-mono">{d.meanActual.toFixed(0)} MW</span>
                          </div>
                          <div style={{ color: '#fb7185', marginTop: '2px' }}>
                            Day Bias: <span className="font-mono">+{d.bias.toFixed(0)} MW</span>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Legend verticalAlign="top" align="right" wrapperStyle={{ fontSize: '12px', paddingBottom: '6px' }} />
                <Line name="Decision Forecast (Daily Mean)" type="monotone" dataKey="meanForecast" stroke="#38bdf8" strokeWidth={2.5} dot={{ r: 3 }} />
                <Line name="Actual Generation (Daily Mean)" type="monotone" dataKey="meanActual" stroke="#10b981" strokeWidth={2.5} dot={{ r: 3 }} />
              </ComposedChart>
            ) : (
              <LineChart data={hourlyTimeSeries} margin={{ top: 10, right: 20, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis dataKey="time" stroke="#64748b" tick={{ fill: '#94a3b8', fontSize: 10 }} interval={47} />
                <YAxis
                  stroke="#64748b"
                  tick={{ fill: '#94a3b8', fontSize: 11 }}
                  tickFormatter={(v) => `${(v / 1000).toFixed(1)} GW`}
                />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      const d = payload[0].payload;
                      return (
                        <div className="custom-tooltip text-xs">
                          <div className="font-bold text-slate-100">{label} UTC</div>
                          <div style={{ color: '#38bdf8' }}>Forecast: {d.forecast.toLocaleString()} MW</div>
                          <div style={{ color: '#10b981' }}>Actual: {d.actual.toLocaleString()} MW</div>
                          <div style={{ color: '#fb7185' }}>Error: {d.error > 0 ? `+${d.error.toLocaleString()}` : d.error.toLocaleString()} MW</div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Legend verticalAlign="top" align="right" wrapperStyle={{ fontSize: '12px', paddingBottom: '6px' }} />
                <Line name="Decision Forecast (MW)" type="monotone" dataKey="forecast" stroke="#38bdf8" strokeWidth={1.5} dot={false} />
                <Line name="Actual Generation (MW)" type="monotone" dataKey="actual" stroke="#10b981" strokeWidth={1.5} dot={false} />
              </LineChart>
            )}
          </ResponsiveContainer>
        </div>
      </div>

      {/* 3. Daily Bias & MAE Chart */}
      <div className="card">
        <div className="flex items-center justify-between" style={{ marginBottom: '1rem' }}>
          <div>
            <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              <Calendar size={16} className="text-cyan" />
              Daily Bias &amp; MAE Across January 2026
            </h3>
            <span className="text-xs text-muted">
              Daily error statistics (MW) showing persistent positive bias across almost all trading days
            </span>
          </div>
        </div>

        <div style={{ height: '260px', width: '100%' }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={dailyTimeSeries} margin={{ top: 10, right: 20, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
              <XAxis dataKey="date" stroke="#64748b" tick={{ fill: '#94a3b8', fontSize: 11 }} />
              <YAxis stroke="#64748b" tick={{ fill: '#94a3b8', fontSize: 11 }} />
              <ReferenceLine y={0} stroke="#475569" />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    const d = payload[0].payload;
                    return (
                      <div className="custom-tooltip text-xs">
                        <div className="font-bold text-slate-100">{d.fullDate}</div>
                        <div style={{ color: '#fb7185' }}>Bias: +{d.bias.toFixed(0)} MW</div>
                        <div style={{ color: '#38bdf8' }}>MAE: {d.mae.toFixed(0)} MW</div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Legend verticalAlign="top" align="right" wrapperStyle={{ fontSize: '12px', paddingBottom: '6px' }} />
              <Bar name="Daily Bias (MW)" dataKey="bias" fill="#fb7185" opacity={0.85} radius={[2, 2, 0, 0]} />
              <Bar name="Daily MAE (MW)" dataKey="mae" fill="#38bdf8" opacity={0.7} radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 4. Two-Column Grid: Diurnal Error (By Hour) & Error vs Horizon */}
      <div className="grid grid-cols-2 lg-grid-cols-1 gap-6">
        {/* Error by Hour of Day */}
        <div className="card">
          <div style={{ marginBottom: '1rem' }}>
            <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              <Clock size={16} className="text-amber" />
              Diurnal Error Profile (By Hour of Day)
            </h3>
            <span className="text-xs text-muted">
              Aggregated across 31 days: Bias peaks at night (&gt;2.3 GW at 04:00-06:00 UTC)
            </span>
          </div>

          <div style={{ height: '260px', width: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={hourData} margin={{ top: 10, right: 15, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis dataKey="hour" stroke="#64748b" tick={{ fill: '#94a3b8', fontSize: 10 }} interval={2} />
                <YAxis stroke="#64748b" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      const d = payload[0].payload;
                      return (
                        <div className="custom-tooltip text-xs">
                          <div className="font-bold text-slate-100">Hour: {label} UTC</div>
                          <div style={{ color: '#fb7185' }}>Bias: +{d.bias.toFixed(0)} MW</div>
                          <div style={{ color: '#38bdf8' }}>MAE: {d.mae.toFixed(0)} MW</div>
                          <div style={{ color: '#94a3b8' }}>Forecast Mean: {d.forecast.toFixed(0)} MW</div>
                          <div style={{ color: '#10b981' }}>Actual Mean: {d.actual.toFixed(0)} MW</div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Legend verticalAlign="top" align="right" wrapperStyle={{ fontSize: '11px', paddingBottom: '4px' }} />
                <Bar name="Mean Bias (MW)" dataKey="bias" fill="#fb7185" radius={[2, 2, 0, 0]} />
                <Bar name="Mean MAE (MW)" dataKey="mae" fill="#38bdf8" opacity={0.65} radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Forecast Error vs Horizon */}
        <div className="card">
          <div style={{ marginBottom: '1rem' }} className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <BarChart3 size={16} className="text-cyan" />
                <h3 className="text-sm font-bold text-slate-100">
                  Forecast Error vs. Lead Time (Horizon)
                </h3>
              </div>
              <span className="text-xs text-muted">
                Accuracy degradation as lead time increases (0 to 48 hours)
              </span>
            </div>
            <span className="badge badge-indigo" style={{ fontSize: '10px' }}>
              Supplementary Analysis
            </span>
          </div>

          <div style={{ height: '260px', width: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={horizonData} margin={{ top: 10, right: 15, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis dataKey="horizon" stroke="#64748b" tick={{ fill: '#94a3b8', fontSize: 10 }} interval={3} />
                <YAxis stroke="#64748b" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      const d = payload[0].payload;
                      return (
                        <div className="custom-tooltip text-xs">
                          <div className="font-bold text-slate-100">Lead Time: {label}</div>
                          <div style={{ color: '#38bdf8' }}>MAE: {d.mae.toLocaleString()} MW</div>
                          <div style={{ color: '#818cf8' }}>RMSE: {d.rmse.toLocaleString()} MW</div>
                          <div style={{ color: '#fb7185' }}>Bias: +{d.bias.toLocaleString()} MW</div>
                          <div className="text-dim" style={{ marginTop: '2px' }}>Sample count: {d.count}</div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Legend verticalAlign="top" align="right" wrapperStyle={{ fontSize: '11px', paddingBottom: '4px' }} />
                <Line name="MAE (MW)" type="monotone" dataKey="mae" stroke="#38bdf8" strokeWidth={2} dot={{ r: 2 }} />
                <Line name="RMSE (MW)" type="monotone" dataKey="rmse" stroke="#818cf8" strokeWidth={2} dot={{ r: 2 }} />
                <Line name="Bias (MW)" type="monotone" dataKey="bias" stroke="#fb7185" strokeWidth={1.5} strokeDasharray="3 3" dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

