import React from 'react';
import { AlertTriangle, TrendingUp, ShieldAlert, CheckCircle2 } from 'lucide-react';
import { MetricValues } from '../types';

interface TraderInsightBoxProps {
  overallMetrics?: MetricValues;
  dayMetrics?: MetricValues;
  selectedDate: string;
}

export const TraderInsightBox: React.FC<TraderInsightBoxProps> = ({
  overallMetrics,
  dayMetrics,
  selectedDate,
}) => {
  if (!overallMetrics) return null;

  const bias = overallMetrics.bias;
  const p95 = overallMetrics.p95_abs_error;
  const mae = overallMetrics.mae;
  const overOrUnder = bias >= 0 ? 'over-estimated' : 'under-estimated';
  const biasAbs = Math.abs(bias).toFixed(0);
  const p95Formatted = p95.toFixed(0);

  // Day specific stats if available
  const dayBias = dayMetrics ? dayMetrics.bias : null;
  const dayOverOrUnder = dayBias !== null && dayBias >= 0 ? 'over-forecast' : 'under-forecast';

  return (
    <div
      className="card"
      style={{
        background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.7) 0%, rgba(15, 23, 42, 0.9) 100%)',
        borderColor: bias > 1000 ? '#e11d48' : '#0284c7',
        borderLeftWidth: '4px',
        marginBottom: '1.5rem',
        padding: '1.25rem 1.5rem',
      }}
    >
      <div className="flex items-start gap-4">
        <div
          style={{
            background: 'rgba(244, 63, 94, 0.15)',
            padding: '0.625rem',
            borderRadius: '0.5rem',
            color: '#fb7185',
            marginTop: '2px',
          }}
        >
          <ShieldAlert size={22} />
        </div>

        <div style={{ flex: 1 }}>
          <div className="flex items-center justify-between md-flex-col gap-2" style={{ marginBottom: '0.5rem' }}>
            <h3 className="text-sm font-bold uppercase tracking-wider text-rose">
              Day-Ahead Power Trading Desk Advisory &bull; National Wind Procurement
            </h3>
            <span className="badge badge-amber font-mono">
              Month Baseline Bias: +{biasAbs} MW
            </span>
          </div>

          <div className="text-sm text-slate-200" style={{ lineHeight: '1.6' }}>
            <p style={{ marginBottom: '0.5rem' }}>
              <strong>Operational Risk Warning: </strong>
              Wind forecasts at decision time (09:00 UK on D-1) <strong>{overOrUnder}</strong> generation by{' '}
              <strong className="text-rose font-mono">+{biasAbs} MW</strong> on average across the month.
              The verified finding is: forecasts over-predict FUELHH wind by about 1.75 GW at every horizon. Possible explanations (e.g. embedded wind or transmission curtailment) cannot be verified with the data available in this challenge. Traders procuring power based purely on the nominal wind forecast will systematically under-purchase thermal baseload, risking cashout / System Buy Price (SBP) imbalance charges.
            </p>

            <div className="grid grid-cols-3 md-grid-cols-1 gap-3" style={{ marginTop: '0.75rem' }}>
              <div className="card-sm flex items-start gap-2">
                <AlertTriangle size={16} className="text-amber" style={{ marginTop: '2px' }} />
                <div className="text-xs">
                  <span className="text-muted block">Recommended Reserve Buffer:</span>
                  <span className="font-mono font-bold text-amber">
                    &plusmn;{p95Formatted} MW (P95)
                  </span>
                  <span className="text-dim block">Covers 95% of forecast shock</span>
                </div>
              </div>

              <div className="card-sm flex items-start gap-2">
                <TrendingUp size={16} className="text-cyan" style={{ marginTop: '2px' }} />
                <div className="text-xs">
                  <span className="text-muted block">Expected Mean Error (MAE):</span>
                  <span className="font-mono font-bold text-cyan">{mae.toFixed(0)} MW</span>
                  <span className="text-dim block">Average deviation from actuals</span>
                </div>
              </div>

              <div className="card-sm flex items-start gap-2">
                <CheckCircle2 size={16} className="text-emerald" style={{ marginTop: '2px' }} />
                <div className="text-xs">
                  <span className="text-muted block">Selected Day ({selectedDate}):</span>
                  {dayBias !== null ? (
                    <span className="font-mono font-bold text-slate-100">
                      {dayOverOrUnder} by {Math.abs(dayBias).toFixed(0)} MW
                    </span>
                  ) : (
                    <span className="text-muted">Viewing day-level metrics</span>
                  )}
                  <span className="text-dim block">Day D outturn comparison</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

