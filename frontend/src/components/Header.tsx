import React from 'react';
import { Wind, Clock, HelpCircle, Activity } from 'lucide-react';

interface HeaderProps {
  cutoffHour: number;
  deliveryWindow: string;
  onOpenMethodology: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  cutoffHour,
  deliveryWindow,
  onOpenMethodology,
}) => {
  return (
    <header className="card" style={{ marginBottom: '1.5rem', padding: '1rem 1.5rem' }}>
      <div className="flex items-center justify-between md-flex-col gap-4">
        {/* Brand & Title */}
        <div className="flex items-center gap-3">
          <div
            style={{
              width: '42px',
              height: '42px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 15px rgba(2, 132, 199, 0.4)',
            }}
          >
            <Wind size={24} color="#ffffff" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold" style={{ letterSpacing: '-0.02em' }}>
                UK Wind Power Day-Ahead Trading Desk
              </h1>
              <span className="badge badge-cyan">National GB</span>
            </div>
            <p className="text-xs text-muted">
              Elexon BMRS WINDFOR (Forecasts) vs FUELHH (BM Wind Actuals) &bull; January 2026 Decisions
            </p>
          </div>
        </div>

        {/* Status Indicators & Methodology Button */}
        <div className="flex items-center gap-3">
          <div className="card-sm flex items-center gap-2">
            <Clock size={15} className="text-cyan" />
            <div className="text-xs">
              <span className="text-muted">Decision Cutoff: </span>
              <strong className="text-main font-mono">
                {String(cutoffHour).padStart(2, '0')}:00 UK on D-1
              </strong>
            </div>
          </div>

          <div className="card-sm flex items-center gap-2">
            <Activity size={15} className="text-emerald" />
            <div className="text-xs">
              <span className="text-muted">Scope: </span>
              <span className="text-main font-mono">{deliveryWindow}</span>
            </div>
          </div>

          <button
            onClick={onOpenMethodology}
            className="btn btn-secondary text-xs"
            title="Read Methodology & Assumptions"
          >
            <HelpCircle size={15} />
            <span>Methodology</span>
          </button>
        </div>
      </div>
    </header>
  );
};

