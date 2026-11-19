'use client';

import { useState } from 'react';

const PRESETS = [50, 100, 1000, 10000];
const money = (n) => (n < 1 ? `$${n.toFixed(n < 0.1 ? 4 : 3)}` : `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);

/**
 * "Where every trade goes" as an interactive receipt:
 * pick a trade size and watch the 1% fee split into Pons, operations and the agent's treasury.
 */
export default function TokenFlow() {
  const [amt, setAmt] = useState(100);
  const fee = amt * 0.01;
  const pons = fee * 0.3;
  const ops = fee * 0.7 * 0.7;
  const treasury = fee * 0.7 * 0.3;

  const rows = [
    { key: 'pons', label: 'Pons protocol', note: '30% of the fee', value: pons, pct: 30 },
    { key: 'ops', label: 'Servers, AI, gas, listings', note: '70% of the creator fee', value: ops, pct: 49 },
    { key: 'treasury', label: 'Agent treasury', note: '30% of the creator fee · buys back $BREATH', value: treasury, pct: 21 },
  ];

  return (
    <div className="receipt">
      <div className="receipt-top">
        <div>
          <span className="kicker mono">Try a trade</span>
          <div className="receipt-amt">{money(amt)}<small> trade</small></div>
        </div>
        <div className="receipt-fee">
          <span className="mono">1% fee</span>
          <b>{money(fee)}</b>
        </div>
      </div>

      <input
        className="receipt-range"
        type="range"
        min="10"
        max="10000"
        step="10"
        value={amt}
        onChange={(e) => setAmt(Number(e.target.value))}
        aria-label="Trade size in dollars"
        style={{ '--p': `${((amt - 10) / 9990) * 100}%` }}
      />
      <div className="receipt-presets">
        {PRESETS.map((p) => (
          <button key={p} type="button" className={`chip mono ${amt === p ? 'on' : ''}`} onClick={() => setAmt(p)}>
            ${p.toLocaleString('en-US')}
          </button>
        ))}
      </div>

      <div className="receipt-bar" aria-hidden="true">
        {rows.map((r) => (
          <span key={r.key} className={`rb rb-${r.key}`} style={{ flexBasis: `${r.pct}%` }}>
            <i className="rb-flow" />
            <em className="mono">{r.pct}%</em>
          </span>
        ))}
      </div>

      <ul className="receipt-rows">
        {rows.map((r) => (
          <li key={r.key} className={`rr rr-${r.key}`}>
            <span className={`rr-dot rb-${r.key}`} />
            <span className="rr-text">
              <b>{r.label}</b>
              <small className="muted">{r.note}</small>
            </span>
            <span className="rr-lead" />
            <span className="rr-val mono">{money(r.value)}</span>
          </li>
        ))}
      </ul>

      <div className="receipt-will">
        <span className="kicker mono">When it dies, the treasury goes to</span>
        <div className="will-bar">
          <span style={{ flexBasis: '70%' }}>70% holders</span>
          <span style={{ flexBasis: '20%' }}>20% saviors</span>
          <span style={{ flexBasis: '10%' }}>10%</span>
        </div>
        <small className="muted">10% seeds the next generation. Fixed supply, 100% launched into the Pons bonding curve, no team allocation.</small>
      </div>
    </div>
  );
}
