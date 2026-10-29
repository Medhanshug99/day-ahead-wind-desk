import React from 'react';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';

interface DeliveryPickerProps {
  selectedDate: string; // YYYY-MM-DD
  onChange: (date: string) => void;
  minDate?: string;
  maxDate?: string;
}

// Format YYYY-MM-DD into "Sun 4 Jan 2026" without timezone ambiguity
export const formatDeliveryDate = (isoStr: string): string => {
  const parts = isoStr.split('-').map(Number);
  if (parts.length !== 3) return isoStr;
  const [year, month, day] = parts;
  const d = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
  return new Intl.DateTimeFormat('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(d).replace(',', '');
};

// Generate list of delivery dates for January 2026 (Jan 2 - Feb 1)
const generateDateOptions = (start: string, end: string) => {
  const dates: { value: string; label: string }[] = [];
  const [sy, sm, sd] = start.split('-').map(Number);
  const [ey, em, ed] = end.split('-').map(Number);
  const cur = new Date(Date.UTC(sy, sm - 1, sd, 12, 0, 0));
  const last = new Date(Date.UTC(ey, em - 1, ed, 12, 0, 0));

  while (cur <= last) {
    const iso = cur.toISOString().split('T')[0];
    dates.push({
      value: iso,
      label: formatDeliveryDate(iso),
    });
    cur.setUTCDate(cur.getUTCDate() + 1);
  }
  return dates;
};

export const DeliveryPicker: React.FC<DeliveryPickerProps> = ({
  selectedDate,
  onChange,
  minDate = '2026-01-02',
  maxDate = '2026-02-01',
}) => {
  const dateOptions = generateDateOptions(minDate, maxDate);

  const currentIndex = dateOptions.findIndex((d) => d.value === selectedDate);
  const isFirst = currentIndex <= 0;
  const isLast = currentIndex >= dateOptions.length - 1;

  const handlePrev = () => {
    if (!isFirst && currentIndex > 0) {
      onChange(dateOptions[currentIndex - 1].value);
    }
  };

  const handleNext = () => {
    if (!isLast && currentIndex < dateOptions.length - 1) {
      onChange(dateOptions[currentIndex + 1].value);
    }
  };

  return (
    <div className="inline-flex items-center gap-1.5" style={{ userSelect: 'none' }}>
      <button
        onClick={handlePrev}
        disabled={isFirst}
        className="btn btn-secondary"
        style={{ width: '28px', height: '28px', padding: 0 }}
        aria-label="Previous delivery day"
        title="Previous delivery day"
      >
        <ChevronLeft size={16} />
      </button>

      {/* Styled Date Dropdown with Calendar Icon */}
      <div
        className="inline-flex items-center gap-2"
        style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-muted)',
          borderRadius: 'var(--radius-sm)',
          padding: '0.25rem 0.625rem',
          height: '28px',
        }}
      >
        <Calendar size={13} style={{ color: 'var(--text-muted)' }} />
        <select
          value={selectedDate}
          onChange={(e) => onChange(e.target.value)}
          aria-label="Select delivery day"
          className="tabular-nums"
          style={{
            background: 'transparent',
            border: 'none',
            color: 'var(--text-primary)',
            fontSize: 'var(--text-xs)',
            fontWeight: 600,
            cursor: 'pointer',
            outline: 'none',
            paddingRight: '0.25rem',
          }}
        >
          {dateOptions.map((opt) => (
            <option
              key={opt.value}
              value={opt.value}
              style={{ background: 'var(--bg-elevated)', color: 'var(--text-primary)' }}
            >
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      <button
        onClick={handleNext}
        disabled={isLast}
        className="btn btn-secondary"
        style={{ width: '28px', height: '28px', padding: 0 }}
        aria-label="Next delivery day"
        title="Next delivery day"
      >
        <ChevronRight size={16} />
      </button>
    </div>
  );
};
