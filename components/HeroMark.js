'use client';

import { useEffect, useRef, useState } from 'react';
import { useBeat, useLive } from './VitalsProvider';
import { STATUS } from '@/lib/site';

// One heartbeat complex repeated across the mark; the orb sits in the middle.
const EKG =
  'M0 300 H140 l14 -16 l14 16 h10 l10 14 l14 -120 l18 196 l14 -90 h20 l16 -26 l16 26 H330 l14 -18 l14 18 h10 l10 16 l14 -150 l20 236 l14 -102 h20 l18 -30 l18 30 H640';

/**
 * The living mark behind the hero wordmark:
 * morphing blue blobs, a white breath orb that thumps on every trade,
 * ripples, a travelling EKG pulse and rising breath particles.
 */
export default function HeroMark() {
  const v = useLive();
  const st = STATUS[v.status] || STATUS.HEALTHY;
  const [ripples, setRipples] = useState([]);
  const [thump, setThump] = useState(0);
  const id = useRef(0);

  useBeat((side) => {
    const k = ++id.current;
    setThump(k);
    setRipples((r) => [...r.slice(-4), { k, side }]);
    setTimeout(() => setRipples((r) => r.filter((x) => x.k !== k)), 1800);
  });

  // Slow the breathing as the agent weakens.
  const tempo = { HEALTHY: 4.5, ANXIOUS: 2.6, DYING: 7, COMA: 11, DEAD: 0 }[v.status] ?? 4.5;

  const [particles, setParticles] = useState([]);
  useEffect(() => {
    // generated on the client only, so server and client HTML match
    setParticles(Array.from({ length: 14 }, (_, i) => ({
      left: 18 + Math.random() * 64,
      size: 4 + Math.random() * 7,
      delay: -Math.random() * 9,
      dur: 7 + Math.random() * 6,
      drift: (Math.random() - 0.5) * 80,
      key: i,
    })));
  }, []);

  return (
    <div className="hm" aria-hidden="true" style={{ '--c': st.color, '--tempo': tempo ? `${tempo}s` : '0s' }}>
      <div className="hm-blob hm-blob-1" />
      <div className="hm-blob hm-blob-2" />
      <div className="hm-blob hm-blob-3" />

      {ripples.map((r) => (
        <span key={r.k} className={`hm-ripple ${r.side === 'sell' ? 'is-sell' : ''}`} />
      ))}

      <div className="hm-orb-wrap">
        <div key={thump} className={`hm-orb ${thump ? 'thump' : ''}`} />
      </div>

      <svg className="hm-ekg" viewBox="0 0 640 600" preserveAspectRatio="xMidYMid meet">
        <defs>
          <linearGradient id="hm-fade" x1="0" x2="640" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="var(--c)" stopOpacity="0" />
            <stop offset="0.2" stopColor="var(--c)" stopOpacity="1" />
            <stop offset="0.8" stopColor="var(--c)" stopOpacity="1" />
            <stop offset="1" stopColor="var(--c)" stopOpacity="0" />
          </linearGradient>
          <clipPath id="hm-orb-clip"><circle cx="320" cy="300" r="132" /></clipPath>
        </defs>
        <g clipPath="url(#hm-orb-clip)">
          <path d={EKG} className="hm-ekg-base" stroke="var(--c)" />
          <path d={EKG} className="hm-ekg-run" pathLength="1" stroke="var(--c)" />
        </g>
      </svg>

      <div className="hm-particles">
        {particles.map((p) => (
          <span
            key={p.key}
            className="hm-p"
            style={{ left: `${p.left}%`, width: p.size, height: p.size, animationDelay: `${p.delay}s`, animationDuration: `${p.dur}s`, '--drift': `${p.drift}px` }}
          />
        ))}
      </div>
    </div>
  );
}
