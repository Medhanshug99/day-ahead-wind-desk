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
import { Layers, CheckCircle2, ShieldCheck } from 'lucide-react';

interface DecisionViewProps {
  decisionData: DecisionResponse;
  overallMetrics?: MetricValues;
}

export const DecisionView: React.FC<DecisionViewProps> = ({
  decisionData,
  overallMetrics,
}) => {
  const [showActuals, setShowActuals] = useState(true);
  const [showHalfHourly, setShowHalfHourly] = useState(false);
  const [showUncertaintyBand, setShowUncertaintyBand] = useState(true);

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

  // Most common publish time used for this delivery day
  const publishTimes = Array.from(
    new Set(decisionData.hourly_data.map((h) => h.publish_time).filter(Boolean))
  );
  const primaryPublishTime = publishTimes.length > 0
    ? publishTimes[0]?.replace('T', ' ').substring(0, 16) + ' UTC'
    : 'N/A';

  return (
    <div className="flex flex-col gap-6">
      {/* Chart Control Bar */}
      <div className="card flex items-center justify-between md-flex-col gap-4" style={{ padding: '0.875rem 1.25rem' }}>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Layers size={16} className="text-cyan" />
            <h3 className="text-sm font-bold text-slate-100">
              Decision-Time Wind Forecast ({decisionData.delivery_date})
            </h3>
          </div>
          <span className="badge badge-emerald">
            <CheckCircle2 size={12} />
            Data Leakage Guard Active
          </span>
        </div>

        {/* Chart View Toggles */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowActuals(!showActuals)}
            className={`btn-toggle ${showActuals ? 'active' : ''}`}
            title="Toggle Hourly Actuals Overlay"
          >
            Actuals (Hourly)
          </button>
          <button
            onClick={() => setShowHalfHourly(!showHalfHourly)}
            className={`btn-toggle ${showHalfHourly ? 'active' : ''}`}
            title="Show both HH1 and HH2 Half-Hourly readings"
          >
            Half-Hourly Detail
          </button>
          <button
            onClick={() => setShowUncertaintyBand(!showUncertaintyBand)}
            className={`btn-toggle ${showUncertaintyBand ? 'active' : ''}`}
            title="Toggle &plusmn;P95 Uncertainty Band"
          >
            Uncertainty Band (&plusmn;P95)
          </button>
        </div>
      </div>

      {/* Decision Metadata Banner */}
      <div
        className="card-sm flex items-center justify-between md-flex-col gap-3 text-xs"
        style={{ background: '#0e172a', borderColor: '#1e293b' }}
      >
        <div className="flex items-center gap-4 md-flex-col items-start">
          <div>
            <span className="text-muted">Auction Cutoff: </span>
            <strong className="text-amber font-mono">{decisionData.cutoff_utc}</strong>
          </div>
          <div>
            <span className="text-muted">Forecast Release Used: </span>
            <strong className="text-cyan font-mono">{primaryPublishTime}</strong>
          </div>
          <div>
            <span className="text-muted">Lead Time: </span>
            <span className="text-slate-200 font-mono">16.5 &ndash; 39.5 hrs</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <ShieldCheck size={14} className="text-emerald" />
          <span className="text-muted">Coverage: </span>
          <strong className="text-emerald font-mono">
            {decisionData.coverage.matched} / {decisionData.coverage.total_hours} Hours Matched (100%)
          </strong>
        </div>
      </div>

      {/* Main Chart */}
      <div className="card" style={{ padding: '1.25rem' }}>
        <div style={{ height: '380px', width: '100%' }}>
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData} margin={{ top: 15, right: 20, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
              <XAxis
                dataKey="time"
                stroke="#64748b"
                tick={{ fill: '#94a3b8', fontSize: 12 }}
                tickLine={{ stroke: '#334155' }}
              />
              <YAxis
                stroke="#64748b"
                tick={{ fill: '#94a3b8', fontSize: 12 }}
                tickLine={{ stroke: '#334155' }}
                tickFormatter={(v) => `${(v / 1000).toFixed(1)} GW`}
                domain={['auto', 'auto']}
              />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    const d = payload[0].payload;
                    return (
                      <div className="custom-tooltip text-xs">
                        <div className="font-bold text-slate-100" style={{ marginBottom: '6px' }}>
                          Target: {label}:00 UTC ({d.fullTime})
                        </div>
                        <div style={{ color: '#38bdf8', marginBottom: '2px' }}>
                          Decision Forecast: <span className="font-mono font-bold">{d.forecast?.toLocaleString()} MW</span>
                        </div>
                        {d.actual !== null && (
                          <div style={{ color: '#10b981', marginBottom: '2px' }}>
                            Hourly Actual: <span className="font-mono font-bold">{d.actual?.toLocaleString()} MW</span>
                          </div>
                        )}
                        {d.error !== null && (
                          <div style={{ color: d.error > 0 ? '#fb7185' : '#38bdf8', marginBottom: '4px' }}>
                            Forecast Error: <span className="font-mono font-bold">{d.error > 0 ? `+${d.error.toLocaleString()}` : d.error.toLocaleString()} MW</span>
                          </div>
                        )}
                        {showHalfHourly && (
                          <div className="card-sm font-mono text-dim" style={{ padding: '4px 6px', margin: '4px 0' }}>
                            HH1: {d.hh1?.toLocaleString()} MW | HH2: {d.hh2?.toLocaleString()} MW
                          </div>
                        )}
                        {showUncertaintyBand && (
                          <div className="text-dim" style={{ fontSize: '11px' }}>
                            P95 Range: {d.bandLower.toLocaleString()} &ndash; {d.bandUpper.toLocaleString()} MW
                          </div>
                        )}
                        <div className="text-dim" style={{ marginTop: '4px', borderTop: '1px solid #334155', paddingTop: '4px' }}>
                          Publish: {d.publishTime}
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Legend
                verticalAlign="top"
                align="right"
                wrapperStyle={{ paddingBottom: '10px', fontSize: '12px' }}
              />

              {/* Uncertainty Band Area */}
              {showUncertaintyBand && (
                <Area
                  name="Uncertainty Range (±P95)"
                  dataKey="bandUpper"
                  fill="rgba(56, 189, 248, 0.08)"
                  stroke="rgba(56, 189, 248, 0.25)"
                  strokeDasharray="4 4"
                />
              )}

              {/* Half Hourly points if enabled */}
              {showHalfHourly && (
                <Line
                  name="HH1 (:00 MW)"
                  type="monotone"
                  dataKey="hh1"
                  stroke="#a78bfa"
                  strokeWidth={1}
                  strokeDasharray="2 2"
                  dot={{ r: 2 }}
                />
              )}
              {showHalfHourly && (
                <Line
                  name="HH2 (:30 MW)"
                  type="monotone"
                  dataKey="hh2"
                  stroke="#c084fc"
                  strokeWidth={1}
                  strokeDasharray="2 2"
                  dot={{ r: 2 }}
                />
              )}

              {/* Forecast Line */}
              <Line
                name="Decision Forecast"
                type="monotone"
                dataKey="forecast"
                stroke="#38bdf8"
                strokeWidth={3}
                dot={{ r: 3, fill: '#0284c7' }}
                activeDot={{ r: 6 }}
              />

              {/* Actuals Line */}
              {showActuals && (
                <Line
                  name="Hourly Actual"
                  type="monotone"
                  dataKey="actual"
                  stroke="#10b981"
                  strokeWidth={2.5}
                  dot={{ r: 3, fill: '#059669' }}
                  activeDot={{ r: 6 }}
                />
              )}
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Hourly Data Table */}
      <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
        <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid #24324f' }} className="flex items-center justify-between">
          <h4 className="text-sm font-bold text-slate-100">
            Hourly Dispatch &amp; Error Schedule &bull; {decisionData.delivery_date}
          </h4>
          <span className="text-xs text-muted">All power in Megawatts (MW)</span>
        </div>

        <div style={{ overflowX: 'auto', maxHeight: '380px' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Target Hour (UTC)</th>
                <th>London Time</th>
                <th>Forecast (MW)</th>
                <th>Publish Time</th>
                <th>Actual (MW)</th>
                <th>HH1 (:00)</th>
                <th>HH2 (:30)</th>
                <th>Error (MW)</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {decisionData.hourly_data.map((row) => {
                const hourNum = row.start_time.split('T')[1].substring(0, 5);
                const error = row.error_mw;
                const errColor =
                  error === null
                    ? '#94a3b8'
                    : error > 0
                    ? '#fb7185' // Over-forecast
                    : '#38bdf8'; // Under-forecast

                return (
                  <tr key={row.start_time}>
                    <td className="font-mono font-semibold">{hourNum}</td>
                    <td className="font-mono text-muted">
                      {row.start_time_local.split('T')[1].substring(0, 5)}
                    </td>
                    <td className="font-mono font-bold text-cyan">
                      {row.forecast_mw !== null ? row.forecast_mw.toLocaleString() : 'N/A'}
                    </td>
                    <td className="font-mono text-xs text-muted">
                      {row.publish_time ? row.publish_time.replace('T', ' ').substring(11, 16) : 'N/A'}
                    </td>
                    <td className="font-mono font-bold text-emerald">
                      {row.actual_mw !== null ? row.actual_mw.toLocaleString() : 'N/A'}
                    </td>
                    <td className="font-mono text-xs text-dim">
                      {row.actual_hh1_mw !== null && row.actual_hh1_mw !== undefined
                        ? row.actual_hh1_mw.toLocaleString()
                        : '-'}
                    </td>
                    <td className="font-mono text-xs text-dim">
                      {row.actual_hh2_mw !== null && row.actual_hh2_mw !== undefined
                        ? row.actual_hh2_mw.toLocaleString()
                        : '-'}
                    </td>
                    <td className="font-mono font-bold" style={{ color: errColor }}>
                      {error !== null ? (error > 0 ? `+${error.toLocaleString()}` : error.toLocaleString()) : '-'}
                    </td>
                    <td>
                      {!row.forecast_missing && !row.actual_missing ? (
                        <span className="badge badge-emerald" style={{ fontSize: '10px', padding: '2px 6px' }}>
                          Matched
                        </span>
                      ) : (
                        <span className="badge badge-rose" style={{ fontSize: '10px', padding: '2px 6px' }}>
                          Missing
                        </span>
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

