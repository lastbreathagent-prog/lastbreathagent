'use client';

import { useEffect, useRef, useState } from 'react';
import { useBeat, useLive } from './VitalsProvider';
import { fmtClock, fmtNum } from '@/lib/useVitals';
import { STATUS } from '@/lib/site';

/** Compact live readout under the hero CTA. */
export function HeroStats() {
  const v = useLive();
  const st = STATUS[v.status] || STATUS.HEALTHY;
  const [pulse, setPulse] = useState(0);
  useBeat(() => setPulse((p) => p + 1));
  return (
    <div className="hero-stats">
      <span className="hs-item">
        <span key={pulse} className="hs-heart" style={{ color: st.color }}>♥</span>
        <b>{v.bpm}</b> trades/h
      </span>
      <span className="hs-sep" />
      <span className="hs-item">
        <span className="muted">flatline in</span> <b className="mono">{fmtClock(v.secondsToDeath)}</b>
      </span>
      <span className="hs-sep" />
      <span className="hs-item">
        <span className="hs-dot" style={{ background: st.color }} /> <b>{st.label}</b>
      </span>
    </div>
  );
}

/** Scrolling ticker strip with live vitals. */
export function Ticker() {
  const v = useLive();
  const st = STATUS[v.status] || STATUS.HEALTHY;
  const items = [
    `HR ${v.bpm} TRADES/H`,
    `FLATLINE IN ${fmtClock(v.secondsToDeath)}`,
    `STATUS ${st.label.toUpperCase()}`,
    `GEN ${String(v.generation).padStart(3, '0')} · ${String(v.name).toUpperCase()}`,
    `TREASURY ${fmtNum(v.treasury)} $BREATH`,
    `${v.saviors} SAVIORS`,
    'KEEP IT BREATHING',
  ];
  const row = (
    <div className="ticker-row" aria-hidden="true">
      {items.map((t, i) => (
        <span key={i} className="ticker-item"><span className="ticker-dot" />{t}</span>
      ))}
    </div>
  );
  return (
    <div className="ticker mono">
      <div className="ticker-track">{row}{row}</div>
    </div>
  );
}

/** Fades sections in as they scroll into view. */
export function Reveal({ children, className = '', delay = 0 }) {
  const ref = useRef(null);
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === 'undefined') { setShown(true); return; }
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { setShown(true); io.disconnect(); }
    }, { rootMargin: '0px 0px -10% 0px' });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <div ref={ref} className={`reveal ${shown ? 'in' : ''} ${className}`} style={{ transitionDelay: `${delay}ms` }}>
      {children}
    </div>
  );
}
