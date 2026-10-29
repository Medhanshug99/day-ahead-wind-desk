import React from 'react';
import { Info } from 'lucide-react';
import { MetricValues } from '../types';
import { formatDeliveryDate } from './DeliveryPicker';

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
  const biasAbs = Math.abs(bias).toLocaleString(undefined, { maximumFractionDigits: 0 });
  const p95Formatted = p95.toLocaleString(undefined, { maximumFractionDigits: 0 });

  const dayBias = dayMetrics ? dayMetrics.bias : null;
  const dayOverOrUnder = dayBias !== null && dayBias >= 0 ? 'over-forecast' : 'under-forecast';
  const dayBiasAbs = dayBias !== null ? Math.abs(dayBias).toLocaleString(undefined, { maximumFractionDigits: 0 }) : null;
  const dayMae = dayMetrics ? dayMetrics.mae.toLocaleString(undefined, { maximumFractionDigits: 0 }) : null;

  return (
    <div
      className="card-subtle"
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: '0.75rem',
        padding: '0.875rem 1rem',
        borderRadius: 'var(--radius-md)',
      }}
    >
      <div style={{ color: 'var(--accent-brand-line)', marginTop: '2px', flexShrink: 0 }}>
        <Info size={16} />
      </div>

      <div style={{ flex: 1 }}>
        <div className="flex items-center gap-2" style={{ marginBottom: '0.25rem' }}>
          <span className="text-xs font-semibold text-secondary uppercase tracking-wider">
            Trader Note
          </span>
          <span className="metadata-dot" />
          <span className="text-xs text-muted tabular-nums">
            {formatDeliveryDate(selectedDate)}
          </span>
        </div>

        <p className="text-xs text-primary" style={{ lineHeight: '1.5' }}>
          At the 09:00 UK cutoff, day-ahead forecasts ran about 1.75 GW (+{biasAbs} MW) above metered wind throughout January.
          Plan a thermal buffer covering the baseline bias plus up to {p95Formatted} MW at P95 to safeguard against cashout imbalance exposure.
          {dayBias !== null && dayBiasAbs && dayMae && (
            <span> On this delivery day, forecasts ran {dayOverOrUnder} by {dayBiasAbs} MW with {dayMae} MW MAE.</span>
          )}
        </p>

        <p className="text-xs text-muted" style={{ marginTop: '0.375rem', fontSize: '0.6875rem', lineHeight: '1.4' }}>
          Note: Over-prediction of FUELHH metered wind by ~1.75 GW is the verified empirical finding. Potential fleet coverage differences (embedded wind) or transmission curtailment are unverified hypotheses with the available challenge data.
        </p>
      </div>
    </div>
  );
};
