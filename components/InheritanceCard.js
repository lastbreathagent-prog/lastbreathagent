'use client';

import { useState } from 'react';
import { useLive } from './VitalsProvider';
import { SaviorCheck } from './Panels';
import { fmtNum } from '@/lib/useVitals';
import { INHERITANCE } from '@/lib/site';

const R = 92;
const C = 2 * Math.PI * R;
const GAP = 10; // px gap between arcs

const ICONS = {
  holders: <path d="M8 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm8 0a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM2 19c0-3 3-5 6-5s6 2 6 5M14 14.3c.6-.2 1.3-.3 2-.3 3 0 6 2 6 5" />,
  saviors: <path d="M12 21s-7-4.4-9.3-9C1 8.5 3 5 6.5 5c2 0 3.3 1.1 4.1 2.3h2.8C14.2 6.1 15.5 5 17.5 5 21 5 23 8.5 21.3 12 19 16.6 12 21 12 21Zm-4-9h2l1.5-3 2 6 1.5-3h2" />,
  next: <path d="M12 3v3m0 12v3M3 12h3m12 0h3M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z" />,
};

/** The will: a live ring of the 70/20/10 split, with what each share would get if it died right now. */
export default function InheritanceCard() {
  const v = useLive();
  const [hover, setHover] = useState(null);
  let offset = 0;
  const arcs = INHERITANCE.map((p) => {
    const len = (p.pct / 100) * C - GAP;
    const arc = { ...p, len, offset };
    offset += (p.pct / 100) * C;
    return arc;
  });
  const focus = INHERITANCE.find((p) => p.key === hover);

  return (
    <div className="will">
      <div className="will-main">
        <div className="will-ring">
          <svg viewBox="0 0 240 240" aria-hidden="true">
            <circle cx="120" cy="120" r={R} className="ring-track" />
            {arcs.map((a) => (
              <circle
                key={a.key}
                cx="120" cy="120" r={R}
                className={`ring-arc arc-${a.key} ${hover && hover !== a.key ? 'dim' : ''}`}
                strokeDasharray={`${a.len} ${C}`}
                strokeDashoffset={-a.offset}
                onMouseEnter={() => setHover(a.key)}
                onMouseLeave={() => setHover(null)}
              />
            ))}
            <circle cx="120" cy="120" r="70" className="ring-inner" />
            <g className="ring-orbit"><circle cx="120" cy={120 - R} r="5" className="ring-dot" /></g>
          </svg>
          <div className="ring-center">
            <span className="mono">{focus ? focus.label : 'Treasury'}</span>
            <b>{focus ? `${focus.pct}%` : fmtNum(v.treasury)}</b>
            <small className="mono">{focus ? `${fmtNum(v.treasury * focus.pct / 100)} $BREATH` : '$BREATH saved'}</small>
          </div>
        </div>

        <ul className="heirs">
          {INHERITANCE.map((p) => (
            <li
              key={p.key}
              className={`heir heir-${p.key} ${hover === p.key ? 'on' : ''}`}
              onMouseEnter={() => setHover(p.key)}
              onMouseLeave={() => setHover(null)}
              onClick={() => setHover((h) => (h === p.key ? null : p.key))}
            >
              <span className="heir-icon">
                <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">{ICONS[p.key]}</svg>
              </span>
              <span className="heir-text">
                <span className="heir-top"><b>{p.label}</b><em className="mono">{p.pct}%</em></span>
                <small className="muted">{p.note}</small>
                <span className="heir-bar"><i style={{ width: `${p.pct}%` }} /></span>
                <span className="heir-now mono">If it died now: {fmtNum(v.treasury * p.pct / 100)} $BREATH</span>
              </span>
            </li>
          ))}
        </ul>
      </div>
      <SaviorCheck />
    </div>
  );
}
