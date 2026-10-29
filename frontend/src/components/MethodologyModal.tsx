import React, { useEffect } from 'react';
import { X, ExternalLink } from 'lucide-react';

interface MethodologyModalProps {
  isOpen: boolean;
  onClose: () => void;
  cutoffHour: number;
}

export const MethodologyModal: React.FC<MethodologyModalProps> = ({
  isOpen,
  onClose,
  cutoffHour,
}) => {
  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="modal-overlay"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="methodology-title"
    >
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        {/* Modal Header */}
        <div className="modal-header">
          <div>
            <h2 id="methodology-title" className="text-base font-semibold text-primary">
              Trading Desk Methodology &amp; Assumptions
            </h2>
            <p className="text-xs text-muted" style={{ marginTop: '2px' }}>
              Day-ahead auction timing, data alignment conventions, and operational risk caveats
            </p>
          </div>
          <button
            onClick={onClose}
            className="btn btn-secondary"
            style={{ width: '28px', height: '28px', padding: 0 }}
            aria-label="Close methodology modal"
          >
            <X size={16} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="modal-body">
          {/* 1. Day-Ahead Decision Cutoff */}
          <div style={{ marginBottom: '1.25rem' }}>
            <h3 className="text-xs font-semibold text-primary uppercase tracking-wider" style={{ marginBottom: '0.375rem' }}>
              1. Day-Ahead Decision Cutoff ({String(cutoffHour).padStart(2, '0')}:00 UK on D-1)
            </h3>
            <p style={{ marginBottom: '0.5rem' }}>
              In the UK wholesale power market, the EPEX Spot GB Day-Ahead auction order book gate closure is strictly <strong>09:20 UK time on D-1</strong> (<em>Source: EPEX Spot SE, "GB Day-Ahead Auction Trading Specifications"</em>).
            </p>
            <p style={{ color: 'var(--text-secondary)' }}>
              To ensure bids are validated and committed before auction close, the trading desk applies an operational cutoff at <strong>09:00 UK time on D-1</strong> (a conservative 20-minute operational buffer).
              Any WINDFOR forecast published at or after 09:00:01 UTC is strictly discarded to eliminate data leakage.
              In January, UK local time is Greenwich Mean Time (GMT = UTC+0), meaning UK local time equals UTC.
            </p>
          </div>

          {/* 2. Scope & Delivery Window */}
          <div style={{ marginBottom: '1.25rem' }}>
            <h3 className="text-xs font-semibold text-primary uppercase tracking-wider" style={{ marginBottom: '0.375rem' }}>
              2. Scope &amp; Delivery Window
            </h3>
            <p style={{ marginBottom: '0.5rem' }}>
              The analysis scope spans all power trading decisions executed in <strong>January 2026</strong>:
            </p>
            <ul style={{ paddingLeft: '1.25rem', listStyleType: 'disc', color: 'var(--text-secondary)' }}>
              <li><strong>Decision dates:</strong> 2026-01-01 through 2026-01-31 (31 decision days).</li>
              <li><strong>Physical delivery days:</strong> 2026-01-02 through 2026-02-01 (delivery D = decision + 1 day).</li>
              <li><strong>Sample size:</strong> 31 delivery days &times; 24 hours = <strong>744 hourly targets</strong> with 100% complete data coverage.</li>
              <li><strong>Ingest snapshots:</strong> WINDFOR and FUELHH streams were cached to immutable snapshots on disk, guaranteeing deterministic, 15ms API response times without live Elexon dependencies at runtime.</li>
            </ul>
          </div>

          {/* 3. Hourly Alignment Rule */}
          <div style={{ marginBottom: '1.25rem' }}>
            <h3 className="text-xs font-semibold text-primary uppercase tracking-wider" style={{ marginBottom: '0.375rem' }}>
              3. Hourly Alignment &amp; Aggregation Rule
            </h3>
            <p style={{ marginBottom: '0.5rem' }}>
              Elexon BMRS WINDFOR reports national wind generation forecasts at <strong>hourly target resolution</strong> (<code>startTime=HH:00:00Z</code>).
              FUELHH reports outturn generation by fuel type at <strong>half-hourly settlement resolution</strong> (periods 1 to 48).
            </p>
            <p style={{ marginBottom: '0.5rem' }}>
              Each hourly forecast target <code>HH:00</code> is matched to the arithmetic mean of the two half-hourly periods:
            </p>
            <div
              className="tabular-nums text-xs"
              style={{
                background: 'var(--bg-subtle)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-sm)',
                padding: '0.5rem 0.75rem',
                margin: '0.5rem 0',
                fontFamily: 'var(--font-mono)',
              }}
            >
              Hourly Actual (HH:00) = [ FUELHH(HH:00, SP 2H+1) + FUELHH(HH:30, SP 2H+2) ] / 2
            </div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.8125rem' }}>
              Forecast error is defined as <code>Error (MW) = Forecast (MW) - Actual (MW)</code>. A positive error denotes forecast over-estimation.
              Empirical shift tests show that the debiased-MAE comparison is the cleaner alignment test, confirming that error is minimized around the canonical 0-minute alignment (~1,372–1,375 MW debiased MAE).
            </p>
          </div>

          {/* 4. Known Data Caveat */}
          <div>
            <h3 className="text-xs font-semibold text-primary uppercase tracking-wider" style={{ marginBottom: '0.375rem' }}>
              4. Known Data Caveat: +1.75 GW Systematic Over-Forecast
            </h3>
            <p style={{ marginBottom: '0.5rem' }}>
              <strong>Verified Empirical Finding:</strong> Across all 744 evaluated hours in January 2026, WINDFOR forecasts over-predict FUELHH wind by approximately <strong>1.75 GW (+1,747.89 MW)</strong> at every forecast horizon.
            </p>
            <p style={{ marginBottom: '0.5rem' }}>
              The following factors are <em>possible explanations, not verified with the data available in this challenge</em>:
            </p>
            <ul style={{ paddingLeft: '1.25rem', listStyleType: 'disc', color: 'var(--text-secondary)' }}>
              <li style={{ marginBottom: '0.375rem' }}>
                <strong>Potential Fleet Coverage Difference:</strong> FUELHH measures metered generation only from Balancing Mechanism (BM) registered units (transmission-connected wind farms). WINDFOR weather models forecast total GB wind generation, which may include 4 to 6 GW of embedded (distribution-connected) wind turbines not metered in FUELHH. This is a possible explanation, not verified with challenge data alone.
              </li>
              <li style={{ marginBottom: '0.375rem' }}>
                <strong>Potential Transmission Curtailment:</strong> In winter months, high wind in Scotland regularly exceeds the export transfer capacity of the Scottish-English B6 boundary. National Grid ESO routinely curtails Scottish wind farms via Balancing Mechanism Bid-Offer Acceptances (BOAs). WINDFOR may forecast unconstrained physical potential, whereas FUELHH reflects delivered energy after curtailment. This is also a possible explanation, not verified with challenge data alone.
              </li>
              <li>
                <strong>Diurnal Trend:</strong> Measured bias peaks overnight (+2.36 GW at 05:00 UTC) when lower local electricity demand in exporting regions coincides with tighter export constraints.
              </li>
            </ul>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="modal-footer">
          <button onClick={onClose} className="btn btn-secondary text-xs" style={{ minWidth: '80px' }}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
