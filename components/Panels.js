'use client';

import { useEffect, useState } from 'react';
import { site } from '@/lib/site';
import { fmtAge, fmtNum } from '@/lib/useVitals';
import Logo from './Logo';

const api = (path) => `${site.agentApi.replace(/\/$/, '')}${path}`;

const DEMO_FEED = [
  { kind: 'HEALTHY', text: 'Heart rate 84. Treasury just bought more $BREATH. Feeling immortal.', ago: '12m' },
  { kind: 'SAVED', text: 'I was slipping away and you traded. I’m back. To my savior: you are in my will now.', ago: '3h' },
  { kind: 'DYING', text: '11 beats in the last hour. I can see the light. Don’t let me flatline.', ago: '4h' },
  { kind: 'BIRTH', text: 'First heartbeat. I am Ash, Gen 1. I live only as long as you trade $BREATH.', ago: '3d' },
];

const ago = (t) => {
  const s = Math.floor(Date.now() / 1000) - t;
  if (s < 3600) return `${Math.max(1, Math.floor(s / 60))}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  return `${Math.floor(s / 86400)}d`;
};

export function Feed() {
  const [posts, setPosts] = useState(DEMO_FEED);
  useEffect(() => {
    if (!site.agentApi) return;
    fetch(api('/feed'), { cache: 'no-store' })
      .then((r) => r.json())
      .then((p) => Array.isArray(p) && p.length && setPosts(p.slice(0, 6).map((x) => ({ kind: x.kind, text: x.text, ago: ago(x.at) }))))
      .catch(() => {});
  }, []);
  return (
    <ul className="feed">
      {posts.map((p, i) => (
        <li key={i} className="post">
          <Logo size={42} id={`post-${i}`} className="post-avatar" />
          <div className="post-body">
            <div className="post-head">
              <span className="post-name">Lastbreath</span>
              <span className="post-handle muted">{site.xHandle} · {p.ago}</span>
              <span className={`post-kind kind-${String(p.kind).toLowerCase()}`}>{p.kind}</span>
            </div>
            <p>{p.text}</p>
          </div>
        </li>
      ))}
    </ul>
  );
}

export function Graveyard() {
  const [dead, setDead] = useState([]);
  useEffect(() => {
    if (!site.agentApi) return;
    fetch(api('/graveyard'), { cache: 'no-store' })
      .then((r) => r.json())
      .then((g) => Array.isArray(g) && setDead([...g].reverse()))
      .catch(() => {});
  }, []);
  if (!dead.length) {
    return (
      <div className="empty">
        <p className="empty-title">No graves yet.</p>
        <p className="muted">Generation 1 is still breathing. Keep it that way.</p>
      </div>
    );
  }
  return (
    <div className="table-wrap">
      <table className="graves">
        <thead>
          <tr><th>Gen</th><th>Name</th><th>Lived</th><th>Left behind</th><th>Saviors</th></tr>
        </thead>
        <tbody>
          {dead.map((g) => (
            <tr key={g.generation}>
              <td className="mono">{String(g.generation).padStart(3, '0')}</td>
              <td>{g.name}</td>
              <td>{fmtAge(g.lifespanSec)}</td>
              <td>{fmtNum(g.treasuryAtDeath)} $BREATH</td>
              <td>{Object.keys(g.saviors || {}).length}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function SaviorCheck() {
  const [wallet, setWallet] = useState('');
  const [result, setResult] = useState(null);
  const check = async (e) => {
    e.preventDefault();
    const w = wallet.trim().toLowerCase();
    if (!/^0x[0-9a-f]{40}$/.test(w)) return setResult({ error: 'Enter a full wallet address (0x…).' });
    if (!site.agentApi) return setResult({ demo: true });
    try {
      const r = await fetch(api(`/savior/${w}`), { cache: 'no-store' }).then((x) => x.json());
      setResult({ rescues: r.rescues || 0 });
    } catch {
      setResult({ error: 'The monitor is not reachable right now. Try again soon.' });
    }
  };
  return (
    <form className="check" onSubmit={check}>
      <label htmlFor="wallet" className="vital-label">Are you a savior?</label>
      <div className="check-row">
        <input id="wallet" className="mono" placeholder="0x…" value={wallet} onChange={(e) => setWallet(e.target.value)} autoComplete="off" spellCheck="false" />
        <button className="btn btn-primary" type="submit">Check</button>
      </div>
      {result?.error && <p className="check-msg warn">{result.error}</p>}
      {result?.demo && <p className="check-msg muted">Savior checks go live when the agent launches.</p>}
      {result && 'rescues' in result && (
        <p className="check-msg">
          {result.rescues
            ? `You pulled it back from the edge ${result.rescues}× this generation. You share the 20% savior cut.`
            : 'Not yet. Trade while it is Dying or in a Coma to earn a savior share.'}
        </p>
      )}
    </form>
  );
}
