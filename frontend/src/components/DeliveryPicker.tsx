import React from 'react';
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react';

interface DeliveryPickerProps {
  selectedDate: string; // YYYY-MM-DD
  onChange: (date: string) => void;
  minDate?: string;
  maxDate?: string;
}

export const DeliveryPicker: React.FC<DeliveryPickerProps> = ({
  selectedDate,
  onChange,
  minDate = '2026-01-02',
  maxDate = '2026-02-01',
}) => {
  const currentDate = new Date(selectedDate);

  const handlePrev = () => {
    const prev = new Date(currentDate);
    prev.setDate(prev.getDate() - 1);
    const iso = prev.toISOString().split('T')[0];
    if (iso >= minDate) onChange(iso);
  };

  const handleNext = () => {
    const next = new Date(currentDate);
    next.setDate(next.getDate() + 1);
    const iso = next.toISOString().split('T')[0];
    if (iso <= maxDate) onChange(iso);
  };

  const isMin = selectedDate <= minDate;
  const isMax = selectedDate >= maxDate;

  // Decision date is delivery date - 1 day
  const decisionDateObj = new Date(currentDate);
  decisionDateObj.setDate(decisionDateObj.getDate() - 1);
  const decisionDateStr = decisionDateObj.toISOString().split('T')[0];

  return (
    <div className="card flex items-center justify-between md-flex-col gap-4" style={{ marginBottom: '1.5rem', padding: '0.875rem 1.25rem' }}>
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <Calendar size={18} className="text-cyan" />
          <span className="text-xs font-semibold uppercase tracking-wider text-muted">
            Delivery Day (D):
          </span>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={handlePrev}
            disabled={isMin}
            className="btn btn-secondary"
            style={{ padding: '0.375rem 0.625rem', opacity: isMin ? 0.4 : 1 }}
            title="Previous Day"
          >
            <ChevronLeft size={16} />
          </button>

          <input
            type="date"
            value={selectedDate}
            min={minDate}
            max={maxDate}
            onChange={(e) => e.target.value && onChange(e.target.value)}
            className="font-mono font-bold text-sm"
            style={{
              background: '#0f172a',
              border: '1px solid #334155',
              color: '#f8fafc',
              padding: '0.375rem 0.75rem',
              borderRadius: '0.375rem',
              cursor: 'pointer',
              outline: 'none',
            }}
          />

          <button
            onClick={handleNext}
            disabled={isMax}
            className="btn btn-secondary"
            style={{ padding: '0.375rem 0.625rem', opacity: isMax ? 0.4 : 1 }}
            title="Next Day"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* Decision Date context */}
      <div className="flex items-center gap-3 text-xs">
        <span className="text-muted">
          Trading Decision Gate: <strong className="text-amber font-mono">{decisionDateStr} 09:00 UK</strong>
        </span>
        <span className="badge badge-indigo">Delivery D = Decision + 1</span>
      </div>
    </div>
  );
};

