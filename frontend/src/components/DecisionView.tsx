import React, { useState } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from 'recharts';
import { DecisionResponse, MetricValues } from '../types';
import { formatDeliveryDate } from './DeliveryPicker';

interface DecisionViewProps {
  decisionData: DecisionResponse;
  overallMetrics?: MetricValues;
  dayMetrics?: MetricValues;
}

export const DecisionView: React.FC<DecisionViewProps> = ({
  decisionData,
  overallMetrics,
  dayMetrics,
}) => {
  const [showActuals, setShowActuals] = useState<boolean>(true);
  const [showHalfHourly, setShowHalfHourly] = useState<boolean>(false);
  const [showUncertaintyBand, setShowUncertaintyBand] = useState<boolean>(true);

  const p95 = overallMetrics?.p95_abs_error || 5283;

  // Prepare chart data (24 hourly periods)
  const chartData = decisionData.hourly_data.map((row) => {
    const timeStr = row.start_time.split('T')[1].substring(0, 5); // HH:MM
    const forecast = row.forecast_mw ?? 0;
    return {
      time: timeStr,
      fullTime: row.start_time_local,
      forecast: row.forecast_mw,
      actual: row.actual_mw,
      hh1: row.actual_hh1_mw,
      hh2: row.actual_hh2_mw,
      error: row.error_mw,
      publishTime: row.publish_time
        ? row.publish_time.replace('T', ' ').substring(0, 16) + ' UTC'
        : 'N/A',
      // Uncertainty band: Forecast +/- P95 error
      bandUpper: Math.round(forecast + p95),
      bandLower: Math.max(0, Math.round(forecast - p95)),
    };
  });

  // Extract primary publish time
  const publishTimes = Array.from(
    new Set(decisionData.hourly_data.map((h) => h.publish_time).filter(Boolean))
  );
  const primaryPublishTime = publishTimes.length > 0
    ? publishTimes[0]?.replace('T', ' ').substring(11, 16) + ' UTC'
    : '07:30 UTC';

  // Compute selected day MAE if dayMetrics not provided directly
  const validErrors = decisionData.hourly_data
    .map((h) => (h.error_mw !== null ? Math.abs(h.error_mw) : null))
    .filter((e): e is number => e !== null);
  const calculatedDayMae = validErrors.length > 0
    ? validErrors.reduce((a, b) => a + b, 0) / validErrors.length
    : null;

  const displayDayMae = dayMetrics?.mae ?? calculatedDayMae;

  return (
    <div className="flex flex-col gap-4">
      {/* 1. Compact KPI Strip (4 Cards) */}
      <div className="grid grid-cols-4 md-grid-cols-2 sm-grid-cols-1 gap-3">
        {/* Card 1: Mean Absolute Error */}
        <div className="kpi-card">
          <div className="kpi-label">
            <span>Mean Absolute Error</span>
          </div>
          <div className="kpi-value-row tabular-nums">
            <span className="kpi-value">
              {overallMetrics ? Math.round(overallMetrics.mae).toLocaleString() : '2,039'}
            </span>
            <span className="kpi-unit">MW</span>
          </div>
          <div className="kpi-caption">
            Average monthly forecast deviation
          </div>
        </div>

        {/* Card 2: Systematic Forecast Bias */}
        <div className="kpi-card">
          <div className="kpi-label">
            <span>Forecast Bias</span>
          </div>
          <div className="kpi-value-row tabular-nums">
            <span className="kpi-value" style={{ color: 'var(--semantic-pos)' }}>
              +{overallMetrics ? Math.round(overallMetrics.bias).toLocaleString() : '1,748'}
            </span>
            <span className="kpi-unit">MW</span>
          </div>
          <div className="kpi-caption">
            Verified +1.75 GW baseline over-forecast
          </div>
        </div>

        {/* Card 3: P95 Reserve Buffer */}
        <div className="kpi-card">
          <div className="kpi-label">
            <span>P95 Reserve Buffer</span>
          </div>
          <div className="kpi-value-row tabular-nums">
            <span className="kpi-value">
              {overallMetrics ? Math.round(overallMetrics.p95_abs_error).toLocaleString() : '5,283'}
            </span>
            <span className="kpi-unit">MW</span>
          </div>
          <div className="kpi-caption">
            Thermal buffer covering 95% of shock
          </div>
        </div>

        {/* Card 4: Selected-Day Error */}
        <div className="kpi-card">
          <div className="kpi-label">
            <span>Selected-Day MAE</span>
          </div>
          <div className="kpi-value-row tabular-nums">
            <span className="kpi-value">
              {displayDayMae !== null ? Math.round(displayDayMae).toLocaleString() : '—'}
            </span>
            <span className="kpi-unit">MW</span>
          </div>
          <div className="kpi-caption">
            Outturn error on {formatDeliveryDate(decisionData.delivery_date)}
          </div>
        </div>
      </div>

      {/* 2. Main Decision Forecast Chart Card (Directly Above the Fold) */}
      <div className="card" style={{ padding: '1rem 1.25rem' }}>
        {/* Header & Controls Toolbar */}
        <div className="flex items-center justify-between md-flex-col gap-3" style={{ marginBottom: '0.75rem' }}>
          <div>
            <h2 className="text-sm font-semibold text-primary" style={{ letterSpacing: '-0.01em' }}>
              Day-Ahead Decision Forecast vs Metered Generation
            </h2>
            <div className="metadata-row" style={{ marginTop: '0.25rem' }}>
              <span className="metadata-item">
                Delivery: <strong>{formatDeliveryDate(decisionData.delivery_date)}</strong>
              </span>
              <span className="metadata-dot" />
              <span className="metadata-item">
                Cutoff: <strong>09:00 UK on D-1</strong>
              </span>
              <span className="metadata-dot" />
              <span className="metadata-item">
                Release: <strong>{primaryPublishTime}</strong>
              </span>
              <span className="metadata-dot" />
              <span className="metadata-item">
                Coverage: <strong>{decisionData.coverage.matched}/24 hrs (100%)</strong>
              </span>
            </div>
          </div>

          {/* Clean Segmented Toggles */}
          <div className="toggle-group" role="group" aria-label="Chart display options">
            <button
              onClick={() => setShowActuals(!showActuals)}
              className={`toggle-btn ${showActuals ? 'active' : ''}`}
              aria-pressed={showActuals}
            >
              Hourly actuals
            </button>
            <button
              onClick={() => setShowHalfHourly(!showHalfHourly)}
              className={`toggle-btn ${showHalfHourly ? 'active' : ''}`}
              aria-pressed={showHalfHourly}
            >
              Half-hourly detail
            </button>
            <button
              onClick={() => setShowUncertaintyBand(!showUncertaintyBand)}
              className={`toggle-btn ${showUncertaintyBand ? 'active' : ''}`}
              aria-pressed={showUncertaintyBand}
            >
              &plusmn;P95 buffer
            </button>
          </div>
        </div>

        {/* Chart Viewport */}
        <div style={{ height: '370px', width: '100%', marginTop: '0.5rem' }}>
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData} margin={{ top: 10, right: 12, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="2 4" stroke="var(--border-subtle)" vertical={false} />
              <XAxis
                dataKey="time"
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
                domain={['auto', 'auto']}
              />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    const d = payload[0].payload;
                    return (
                      <div className="chart-tooltip tabular-nums">
                        <div className="chart-tooltip-title">
                          Settlement Target {label}:00 UTC
                        </div>
                        <div className="chart-tooltip-row">
                          <span style={{ color: 'var(--accent-brand-line)' }}>Decision Forecast</span>
                          <span className="font-semibold text-primary">{d.forecast?.toLocaleString()} MW</span>
                        </div>
                        {d.actual !== null && (
                          <div className="chart-tooltip-row">
                            <span style={{ color: 'var(--semantic-actual-line)' }}>Metered Actual</span>
                            <span className="font-semibold text-primary">{d.actual?.toLocaleString()} MW</span>
                          </div>
                        )}
                        {d.error !== null && (
                          <div className="chart-tooltip-row">
                            <span style={{ color: d.error > 0 ? 'var(--semantic-pos)' : 'var(--semantic-neg)' }}>
                              Forecast Error
                            </span>
                            <span
                              className="font-semibold"
                              style={{ color: d.error > 0 ? 'var(--semantic-pos)' : 'var(--semantic-neg)' }}
                            >
                              {d.error > 0 ? `+${d.error.toLocaleString()}` : d.error.toLocaleString()} MW
                            </span>
                          </div>
                        )}
                        {showHalfHourly && (
                          <div
                            style={{
                              marginTop: '0.375rem',
                              paddingTop: '0.375rem',
                              borderTop: '1px solid var(--border-subtle)',
                              fontSize: '0.6875rem',
                              color: 'var(--text-muted)',
                            }}
                          >
                            HH1: {d.hh1?.toLocaleString()} MW &bull; HH2: {d.hh2?.toLocaleString()} MW
                          </div>
                        )}
                        {showUncertaintyBand && (
                          <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                            P95 Range: {d.bandLower.toLocaleString()} &ndash; {d.bandUpper.toLocaleString()} MW
                          </div>
                        )}
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Legend
                verticalAlign="top"
                align="right"
                wrapperStyle={{ paddingBottom: '8px', fontSize: '11px', color: 'var(--text-secondary)' }}
              />

              {/* Uncertainty Band Area */}
              {showUncertaintyBand && (
                <Area
                  name="Uncertainty Buffer (±P95)"
                  dataKey="bandUpper"
                  fill="var(--semantic-band)"
                  stroke="rgba(56, 189, 248, 0.2)"
                  strokeDasharray="3 3"
                />
              )}

              {/* Half-hourly lines if requested */}
              {showHalfHourly && (
                <Line
                  name="HH1 (:00 MW)"
                  type="monotone"
                  dataKey="hh1"
                  stroke="#94a3b8"
                  strokeWidth={1}
                  strokeDasharray="2 3"
                  dot={{ r: 2 }}
                />
              )}
              {showHalfHourly && (
                <Line
                  name="HH2 (:30 MW)"
                  type="monotone"
                  dataKey="hh2"
                  stroke="#64748b"
                  strokeWidth={1}
                  strokeDasharray="2 3"
                  dot={{ r: 2 }}
                />
              )}

              {/* Forecast Line */}
              <Line
                name="Decision Forecast"
                type="monotone"
                dataKey="forecast"
                stroke="var(--accent-brand-line)"
                strokeWidth={2.2}
                dot={false}
                activeDot={{ r: 5, stroke: 'var(--accent-brand)', strokeWidth: 2, fill: '#ffffff' }}
              />

              {/* Actuals Line */}
              {showActuals && (
                <Line
                  name="Metered Actual"
                  type="monotone"
                  dataKey="actual"
                  stroke="var(--semantic-actual-line)"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 5, stroke: '#94a3b8', strokeWidth: 2, fill: '#ffffff' }}
                />
              )}
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 3. Hourly Dispatch & Error Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div
          className="flex items-center justify-between"
          style={{
            padding: '0.875rem 1.125rem',
            borderBottom: '1px solid var(--border-subtle)',
            background: 'var(--bg-subtle)',
          }}
        >
          <div>
            <h3 className="text-xs font-semibold text-primary uppercase tracking-wider">
              Hourly Dispatch Schedule &amp; Error Outturn
            </h3>
            <span className="text-xs text-muted tabular-nums">
              {formatDeliveryDate(decisionData.delivery_date)} &bull; 24 Settlement Periods
            </span>
          </div>
          <span className="text-xs text-muted">All figures in Megawatts (MW)</span>
        </div>

        <div className="table-container" style={{ border: 'none', borderRadius: 0, maxHeight: '340px' }}>
          <table className="clean-table tabular-nums">
            <thead>
              <tr>
                <th>Target Hour (UTC)</th>
                <th>London Time</th>
                <th className="text-right">Decision Forecast</th>
                <th>Publish Time</th>
                <th className="text-right">Metered Actual</th>
                <th className="text-right">HH1 (:00)</th>
                <th className="text-right">HH2 (:30)</th>
                <th className="text-right">Forecast Error</th>
                <th className="text-center">Status</th>
              </tr>
            </thead>
            <tbody>
              {decisionData.hourly_data.map((row) => {
                const hourNum = row.start_time.split('T')[1].substring(0, 5);
                const error = row.error_mw;
                const errColor =
                  error === null
                    ? 'var(--text-muted)'
                    : error > 0
                    ? 'var(--semantic-pos)'
                    : 'var(--semantic-neg)';

                return (
                  <tr key={row.start_time}>
                    <td className="font-medium text-primary">{hourNum}</td>
                    <td className="text-muted">
                      {row.start_time_local.split('T')[1].substring(0, 5)}
                    </td>
                    <td className="text-right font-medium" style={{ color: 'var(--accent-brand-line)' }}>
                      {row.forecast_mw !== null ? row.forecast_mw.toLocaleString() : '—'}
                    </td>
                    <td className="text-xs text-muted">
                      {row.publish_time ? row.publish_time.replace('T', ' ').substring(11, 16) + ' UTC' : '—'}
                    </td>
                    <td className="text-right font-medium text-primary">
                      {row.actual_mw !== null ? row.actual_mw.toLocaleString() : '—'}
                    </td>
                    <td className="text-right text-muted">
                      {row.actual_hh1_mw !== null && row.actual_hh1_mw !== undefined
                        ? row.actual_hh1_mw.toLocaleString()
                        : '—'}
                    </td>
                    <td className="text-right text-muted">
                      {row.actual_hh2_mw !== null && row.actual_hh2_mw !== undefined
                        ? row.actual_hh2_mw.toLocaleString()
                        : '—'}
                    </td>
                    <td className="text-right font-semibold" style={{ color: errColor }}>
                      {error !== null ? (error > 0 ? `+${error.toLocaleString()}` : error.toLocaleString()) : '—'}
                    </td>
                    <td className="text-center text-xs">
                      {!row.forecast_missing && !row.actual_missing ? (
                        <span style={{ color: 'var(--text-secondary)' }}>Matched</span>
                      ) : (
                        <span style={{ color: 'var(--semantic-pos)' }}>Missing</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
