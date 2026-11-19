'use client';

import { useEffect, useRef, useState } from 'react';
import { site } from './site';

const DAY = 24 * 3600;
const shortWallet = () => {
  const h = () => Math.floor(Math.random() * 16).toString(16);
  return `0x${h()}${h()}${h()}${h()}…${h()}${h()}${h()}${h()}`;
};

// Demo data shown until NEXT_PUBLIC_AGENT_API points at the running agent.
function demoInitial() {
  return {
    live: false,
    generation: 1,
    name: 'Ash',
    status: 'HEALTHY',
    bpm: 74,
    secondsToDeath: DAY - 41,
    treasury: 12_480_000,
    saviors: 3,
    age: 3 * 86400 + 5 * 3600,
    lastTrade: null,
    tradeId: 0,
    recent: [],
  };
}

/** Live vitals from the agent API, or a convincing local demo. `onBeat` fires on every trade. */
export function useVitals(onBeat) {
  const [v, setV] = useState(demoInitial);
  const beatRef = useRef(onBeat);
  beatRef.current = onBeat;

  // Live mode: poll the agent every 5s; fire a beat for each new trade.
  useEffect(() => {
    if (!site.agentApi) return;
    let stop = false;
    let lastSeen = 0;
    const load = async () => {
      try {
        const res = await fetch(`${site.agentApi.replace(/\/$/, '')}/status`, { cache: 'no-store' });
        const s = await res.json();
        const fresh = (s.beats || []).filter((b) => b.t > lastSeen);
        if (lastSeen && fresh.length) fresh.forEach((b) => beatRef.current?.(b.side));
        if (s.beats?.length) lastSeen = Math.max(...s.beats.map((b) => b.t));
        if (!stop) {
          setV((p) => ({
            ...s,
            live: true,
            lastTrade: fresh.length ? { side: fresh.at(-1).side, wallet: '' } : p.lastTrade,
            tradeId: (p.tradeId || 0) + (fresh.length ? 1 : 0),
            recent: [
              ...[...fresh].reverse().map((b, i) => ({ id: `${b.t}-${i}`, side: b.side, wallet: 'trader', t: b.t * 1000 })),
              ...(p.recent || []),
            ].slice(0, 6),
          }));
        }
      } catch {
        /* keep last known vitals */
      }
    };
    load();
    const id = setInterval(load, 5000);
    return () => { stop = true; clearInterval(id); };
  }, []);

  // Demo mode: random trades keep it alive, countdown resets on each one.
  useEffect(() => {
    if (site.agentApi) return;
    let t;
    const trade = () => {
      const side = Math.random() < 0.62 ? 'buy' : 'sell';
      const wallet = shortWallet();
      beatRef.current?.(side);
      setV((p) => ({
        ...p,
        bpm: Math.max(61, Math.min(96, p.bpm + Math.round((Math.random() - 0.45) * 4))),
        secondsToDeath: DAY,
        treasury: p.treasury + (side === 'buy' ? Math.round(Math.random() * 2400) : 0),
        lastTrade: { side, wallet },
        tradeId: (p.tradeId || 0) + 1,
        recent: [{ id: (p.tradeId || 0) + 1, side, wallet, t: Date.now() }, ...(p.recent || [])].slice(0, 6),
      }));
      t = setTimeout(trade, 2500 + Math.random() * 5000);
    };
    t = setTimeout(trade, 1800);
    return () => clearTimeout(t);
  }, []);

  // Countdown ticks locally between updates.
  useEffect(() => {
    const id = setInterval(() => setV((p) => (p.status === 'DEAD' ? p : { ...p, secondsToDeath: Math.max(0, p.secondsToDeath - 1), age: p.age + 1 })), 1000);
    return () => clearInterval(id);
  }, []);

  return v;
}

export const fmtClock = (sec) => {
  const s = Math.max(0, Math.floor(sec));
  const h = String(Math.floor(s / 3600)).padStart(2, '0');
  const m = String(Math.floor((s % 3600) / 60)).padStart(2, '0');
  const x = String(s % 60).padStart(2, '0');
  return `${h}:${m}:${x}`;
};

export const fmtAge = (sec) => {
  const s = Math.max(0, Math.floor(sec));
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  return d ? `${d}d ${h}h` : `${h}h ${Math.floor((s % 3600) / 60)}m`;
};

export const fmtNum = (n) => Math.round(n || 0).toLocaleString('en-US');
