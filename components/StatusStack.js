'use client';

import { useEffect, useState } from 'react';
import { useLive } from './VitalsProvider';
import { STATUS } from '@/lib/site';

const KEYS = Object.keys(STATUS);

/**
 * The five life states as an isometric stack of cards.
 * Starts on the agent's live status, then cycles; tap a row to jump to it.
 */
export default function StatusStack() {
  const v = useLive();
  const [active, setActive] = useState(Math.max(0, KEYS.indexOf(v.status)));
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused) return;
    const id = setInterval(() => setActive((a) => (a + 1) % KEYS.length), 2600);
    return () => clearInterval(id);
  }, [paused]);

  const pick = (i) => { setActive(i); setPaused(true); };

  return (
    <div className="stack-wrap">
      <ol className="stack-list">
        {KEYS.map((k, i) => {
          const s = STATUS[k];
          return (
            <li key={k} className={i === active ? 'on' : ''}>
              <button type="button" onClick={() => pick(i)}>
                <span className="mono stack-n">{String(i + 1).padStart(2, '0')}</span>
                <span className="stack-name">{s.label}{k === v.status && <span className="stack-now mono">NOW</span>}</span>
                <span className="mono stack-rule">{s.rule}</span>
              </button>
              {i === active && <p className="stack-mood muted">{s.mood}</p>}
            </li>
          );
        })}
      </ol>

      <div className="stack-scene" aria-hidden="true">
        {KEYS.map((k, i) => {
          const s = STATUS[k];
          return (
            <div
              key={k}
              className={`iso ${i === active ? 'iso-on' : ''} ${i < active ? 'iso-above' : ''}`}
              style={{ '--i': i, '--c': s.color, zIndex: i === active ? 10 : KEYS.length - i }}
              onClick={() => pick(i)}
            >
              <span className="iso-label mono">{s.label.toUpperCase()}</span>
              <span className="iso-num">{String(i + 1).padStart(2, '0')}</span>
              <svg className="iso-ekg" viewBox="0 0 200 40" preserveAspectRatio="none">
                <path d={['M0 20 H70 l6 -6 l6 6 h6 l6 -16 l8 30 l6 -14 h8 l6 -4 l6 4 H200', 'M0 20 H50 l5 -9 l5 18 l5 -9 H100 l5 -9 l5 18 l5 -9 H150 l5 -9 l5 18 l5 -9 H200', 'M0 20 H90 l6 -6 l8 12 l6 -6 H200', 'M0 20 H96 l4 -2 l4 4 l4 -2 H200', 'M0 20 H200'][i]} />
              </svg>
            </div>
          );
        })}
      </div>
    </div>
  );
}
