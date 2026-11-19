'use client';

import { useEffect, useState } from 'react';
import { useLive } from './VitalsProvider';
import { fmtClock } from '@/lib/useVitals';
import { site, STATUS } from '@/lib/site';

/** Sticky bottom bar on phones once the hero is scrolled past: pulse + buy. */
export default function MobileBar() {
  const v = useLive();
  const st = STATUS[v.status] || STATUS.HEALTHY;
  const [show, setShow] = useState(false);
  useEffect(() => {
    const onScroll = () => setShow(window.scrollY > window.innerHeight * 0.8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  return (
    <div className={`mobile-bar ${show ? 'show' : ''}`} style={{ '--screen': st.screen }}>
      <div className="mb-vitals mono">
        <span className="mb-dot" />
        <span><b>{v.bpm}</b>/h</span>
        <span className="mb-sep" />
        <span>{fmtClock(v.secondsToDeath)}</span>
      </div>
      {site.buyUrl ? (
        <a className="btn btn-primary btn-sm" href={site.buyUrl} target="_blank" rel="noopener noreferrer">Buy {site.ticker}</a>
      ) : (
        <a className="btn btn-primary btn-sm" href={site.xUrl} target="_blank" rel="noopener noreferrer">Follow for launch</a>
      )}
    </div>
  );
}
