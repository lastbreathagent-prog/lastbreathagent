'use client';

import { useRef } from 'react';
import Ekg from './Ekg';
import { useVitals, fmtClock, fmtAge, fmtNum } from '@/lib/useVitals';
import { STATUS } from '@/lib/site';

export default function Monitor() {
  const ekg = useRef(null);
  const v = useVitals((side) => ekg.current?.trade(side));
  const st = STATUS[v.status] || STATUS.HEALTHY;

  return (
    <div className="monitor" style={{ '--status': st.color }}>
      <div className="monitor-top">
        <div className="monitor-id">
          <span className="pill" style={{ background: st.color }}>
            <span className="pill-dot" /> {st.label}
          </span>
          <span className="mono muted">GEN {String(v.generation).padStart(3, '0')} · {v.name}</span>
        </div>
        <span className={`mono tag ${v.live ? 'tag-live' : ''}`}>{v.live ? 'LIVE' : 'DEMO'}</span>
      </div>

      <Ekg ref={ekg} status={v.status} color={st.color} height={170} />

      <div className="vitals">
        <div className="vital">
          <span className="vital-label">Heart rate</span>
          <span className="vital-value" style={{ color: st.color }}>{v.bpm}<small> trades/h</small></span>
        </div>
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
      </div>

      <div className="monitor-foot mono">
        {v.lastTrade ? (
          <span key={v.tradeId} className="flash">
            {v.lastTrade.side === 'buy' ? '▲' : '▼'} {v.lastTrade.wallet || 'a trader'} {v.lastTrade.side === 'buy' ? 'bought' : 'sold'} — heartbeat
          </span>
        ) : (
          <span className="muted">Waiting for the next heartbeat…</span>
        )}
        <span className="muted">{v.saviors} saviors</span>
      </div>
    </div>
  );
}
