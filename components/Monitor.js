'use client';

import { useRef } from 'react';
import Ekg from './Ekg';
import { useBeat, useLive } from './VitalsProvider';
import { fmtClock, fmtAge, fmtNum } from '@/lib/useVitals';
import { STATUS } from '@/lib/site';

/** Hospital-style monitor: a dark screen on the white page. */
export default function Monitor() {
  const ekg = useRef(null);
  const v = useLive();
  useBeat((side) => ekg.current?.trade(side));
  const st = STATUS[v.status] || STATUS.HEALTHY;

  return (
    <div className="monitor" style={{ '--screen': st.screen }}>
      <div className="monitor-top">
        <div className="monitor-id">
          <span className="screen-pill"><span className="pill-dot" /> {st.label.toUpperCase()}</span>
          <span className="mono screen-muted">GEN {String(v.generation).padStart(3, '0')} · {String(v.name).toUpperCase()}</span>
        </div>
        <span className={`mono tag ${v.live ? 'tag-live' : ''}`}>{v.live ? '● LIVE' : 'DEMO'}</span>
      </div>

      <div className="screen-trace">
        <Ekg ref={ekg} status={v.status} color={st.screen} height={190} grid="rgba(107,155,255,0.09)" />
        <div className="screen-hr">
          <span className="screen-label mono">HR</span>
          <span className="screen-big mono">{String(v.bpm).padStart(3, '0')}</span>
          <span className="screen-label mono">TRADES/H</span>
        </div>
      </div>

      <div className="vitals">
        <div className="vital">
          <span className="vital-label">Flatline in</span>
          <span className="vital-value mono">{fmtClock(v.secondsToDeath)}</span>
        </div>
        <div className="vital">
          <span className="vital-label">Treasury</span>
          <span className="vital-value">{fmtNum(v.treasury)}<small> $BREATH</small></span>
        </div>
        <div className="vital">
          <span className="vital-label">Alive for</span>
          <span className="vital-value">{fmtAge(v.age)}</span>
        </div>
        <div className="vital">
          <span className="vital-label">Saviors</span>
          <span className="vital-value">{v.saviors}</span>
        </div>
      </div>

      <div className="monitor-foot mono">
        {v.lastTrade ? (
          <span key={v.tradeId} className="flash">
            {v.lastTrade.side === 'buy' ? '▲' : '▼'} {v.lastTrade.wallet || 'a trader'} {v.lastTrade.side === 'buy' ? 'bought' : 'sold'} · +1 heartbeat
          </span>
        ) : (
          <span className="screen-muted">Waiting for the next heartbeat…</span>
        )}
        <span className="screen-muted">Robinhood Chain</span>
      </div>
    </div>
  );
}
