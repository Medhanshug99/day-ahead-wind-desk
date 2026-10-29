import React from 'react';
import { X, BookOpen, AlertOctagon, Check, Clock, Layers } from 'lucide-react';

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
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div
          className="flex items-center justify-between"
          style={{
            padding: '1.25rem 1.5rem',
            borderBottom: '1px solid #24324f',
            background: '#0f182b',
          }}
        >
          <div className="flex items-center gap-2">
            <BookOpen size={20} className="text-cyan" />
            <h2 className="text-lg font-bold">Trading Desk Methodology &amp; Assumptions</h2>
          </div>
          <button
            onClick={onClose}
            className="btn btn-secondary"
            style={{ padding: '0.375rem', borderRadius: '50%' }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: '1.5rem', lineHeight: '1.6' }} className="text-sm text-slate-300">
          {/* Section 1: Cutoff */}
          <div style={{ marginBottom: '1.5rem' }}>
            <div className="flex items-center gap-2" style={{ marginBottom: '0.5rem' }}>
              <Clock size={16} className="text-amber" />
              <h3 className="text-base font-semibold text-slate-100">
                1. Day-Ahead Decision Cutoff ({String(cutoffHour).padStart(2, '0')}:00 UK on D-1)
              </h3>
            </div>
            <p style={{ marginBottom: '0.5rem' }}>
              The UK wholesale power market operates a Day-Ahead auction for physical delivery on day <em>D</em>.
              According to official exchange documentation (<em>EPEX Spot SE, "GB Day-Ahead Auction Trading Specifications"</em>),
              the EPEX Spot GB auction order book gate closure is strictly <strong>09:20 UK time on D-1</strong>.
            </p>
            <p>
              To ensure trading bids are based only on data available prior to auction submission, the trading desk applies a conservative cutoff at <strong>09:00 UK time on D-1</strong> (20 minutes before gate closure).
              Any forecast published after 09:00:00 UTC is strictly discarded to eliminate data leakage.
              In January, UK time is Greenwich Mean Time (GMT = UTC+0), meaning UK local time equals UTC.
            </p>
          </div>

          {/* Section 2: Temporal Scope */}
          <div style={{ marginBottom: '1.5rem' }}>
            <div className="flex items-center gap-2" style={{ marginBottom: '0.5rem' }}>
              <Layers size={16} className="text-cyan" />
              <h3 className="text-base font-semibold text-slate-100">
                2. Scope &amp; Delivery Window
              </h3>
            </div>
            <p style={{ marginBottom: '0.5rem' }}>
              The analysis scope spans all power trading decisions executed in <strong>January 2026</strong>:
            </p>
            <ul style={{ paddingLeft: '1.5rem', listStyleType: 'disc', marginBottom: '0.5rem' }}>
              <li><strong>Decision dates:</strong> 2026-01-01 through 2026-01-31 (31 decision days).</li>
              <li><strong>Physical delivery days:</strong> 2026-01-02 through 2026-02-01 (delivery = decision date + 1 day).</li>
              <li><strong>Sample size:</strong> 31 days &times; 24 hours = <strong>744 hourly targets</strong> with 100% complete data coverage.</li>
              <li><strong>Forecast fetch window:</strong> Starts 2025-12-29 to capture forecasts published on Dec 31/Jan 1 for early-January delivery.</li>
            </ul>
          </div>

          {/* Section 3: Alignment Rule */}
          <div style={{ marginBottom: '1.5rem' }}>
            <div className="flex items-center gap-2" style={{ marginBottom: '0.5rem' }}>
              <Check size={16} className="text-emerald" />
              <h3 className="text-base font-semibold text-slate-100">
                3. Hourly Alignment &amp; Aggregation Rule
              </h3>
            </div>
            <p style={{ marginBottom: '0.5rem' }}>
              Elexon BMRS WINDFOR reports national wind forecasts at <strong>hourly resolution</strong> (target <code>startTime=HH:00:00Z</code>, documented at <code>bmrs.elexon.co.uk/api-documentation/endpoint/datasets/WINDFOR/stream</code>).
              FUELHH reports outturn generation by fuel type at <strong>half-hourly settlement resolution</strong> (periods 1 to 48, documented at <code>bmrs.elexon.co.uk/api-documentation/endpoint/datasets/FUELHH/stream</code>).
            </p>
            <p>
              Each forecast hour <code>HH:00</code> is mapped to the arithmetic mean of the two corresponding half-hourly FUELHH periods:
            </p>
            <div className="card-sm font-mono text-xs" style={{ margin: '0.5rem 0' }}>
              Hourly Actual (HH:00) = [ FUELHH(HH:00, SP 2H+1) + FUELHH(HH:30, SP 2H+2) ] / 2
            </div>
            <p style={{ marginBottom: '0.5rem' }}>
              Forecast error is defined as: <code>Error (MW) = Forecast (MW) - Actual (MW)</code>.
              A positive error denotes forecast over-estimation (wind fell short of forecast).
            </p>
            <p className="text-xs text-muted">
              Note on alignment shifts: An empirical shift evaluation shows that the debiased-MAE comparison is the cleaner alignment test, confirming that error is minimized around the canonical 0-minute alignment (~1,372–1,375 MW debiased MAE).
            </p>
          </div>

          {/* Section 4: Data Caveat */}
          <div style={{ marginBottom: '0.5rem' }}>
            <div className="flex items-center gap-2" style={{ marginBottom: '0.5rem' }}>
              <AlertOctagon size={16} className="text-rose" />
              <h3 className="text-base font-semibold text-slate-100">
                4. Known Data Caveat: +1.75 GW Systematic Positive Bias
              </h3>
            </div>
            <p style={{ marginBottom: '0.5rem' }}>
              <strong>Verified Finding:</strong> Across the 744 evaluated hours in January 2026, WINDFOR forecasts over-predict FUELHH wind by about <strong>1.75 GW (+1,747.89 MW)</strong> at every horizon (mean forecast 13,031 MW vs mean actual 11,284 MW).
            </p>
            <p style={{ marginBottom: '0.5rem' }}>
              The following factors are <em>possible explanations, not verified with the data available in this challenge</em>:
            </p>
            <ul style={{ paddingLeft: '1.5rem', listStyleType: 'disc' }}>
              <li style={{ marginBottom: '0.25rem' }}>
                <strong>Potential Fleet Coverage Difference:</strong> FUELHH only reports generation from Balancing Mechanism (BM) registered units, which comprise transmission-connected wind farms. National Grid ESO's WINDFOR weather models may forecast a wider fleet (such as including embedded/distributed wind not metered in FUELHH). This is a hypothesis and unverified with BMRS challenge data alone.
              </li>
              <li style={{ marginBottom: '0.25rem' }}>
                <strong>Potential Transmission Curtailment:</strong> In winter, transmission boundary limits (e.g. Scottish-English B6 boundary) can lead ESO to constrain off wind farms via Balancing Mechanism Bid-Offer Acceptances. WINDFOR may forecast unconstrained generation potential, whereas FUELHH reflects metered delivery after curtailment. This is likewise a possible explanation not verified in this challenge.
              </li>
              <li>
                <strong>Observed Diurnal Trend:</strong> The measured bias is higher during night-time hours (peaking above +2.3 GW around 04:00–06:00 UTC), which may coincide with lower overnight demand.
              </li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div
          className="flex justify-end"
          style={{
            padding: '1rem 1.5rem',
            borderTop: '1px solid #24324f',
            background: '#0f182b',
          }}
        >
          <button onClick={onClose} className="btn btn-primary text-xs">
            Acknowledge &amp; Close
          </button>
        </div>
      </div>
    </div>
  );
};

