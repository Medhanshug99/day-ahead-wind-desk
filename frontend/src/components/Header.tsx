import React from 'react';
import { Wind, FileText } from 'lucide-react';

interface HeaderProps {
  cutoffHour: number;
  deliveryWindow: string;
  onOpenMethodology: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  cutoffHour,
  onOpenMethodology,
}) => {
  return (
    <header
      className="flex items-center justify-between md-flex-col gap-3"
      style={{
        paddingBottom: '1rem',
        marginBottom: '1rem',
        borderBottom: '1px solid var(--border-subtle)',
      }}
    >
      {/* Brand & Context */}
      <div className="flex items-center gap-3">
        <div
          style={{
            width: '32px',
            height: '32px',
            borderRadius: 'var(--radius-sm)',
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border-muted)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--accent-brand-line)',
          }}
        >
          <Wind size={18} strokeWidth={2} />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-base font-semibold text-primary" style={{ letterSpacing: '-0.01em' }}>
              UK Wind Power Day-Ahead Trading Desk
            </h1>
          </div>
          <p className="text-xs text-secondary">
            Elexon BMRS WINDFOR (Forecasts) vs FUELHH (Metered Actuals) &bull; January 2026 Decisions
          </p>
        </div>
      </div>

      {/* Right Controls: Single Cutoff Chip + Methodology Button */}
      <div className="flex items-center gap-2.5">
        <div className="chip tabular-nums" style={{ color: 'var(--text-secondary)' }}>
          <span>Decision cutoff {String(cutoffHour).padStart(2, '0')}:00 UK, D-1</span>
        </div>

        <button
          onClick={onOpenMethodology}
          className="btn btn-secondary text-xs"
          style={{ height: '28px', padding: '0 0.625rem' }}
          aria-label="Open trading desk methodology and documentation"
        >
          <FileText size={14} />
          <span>Methodology</span>
        </button>
      </div>
    </header>
  );
};
