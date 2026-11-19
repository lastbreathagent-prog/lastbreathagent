'use client';

import { createContext, useCallback, useContext, useEffect, useRef } from 'react';
import { useVitals } from '@/lib/useVitals';

const Ctx = createContext(null);

/** One shared heartbeat for the whole page, so the hero, ticker and monitor always agree. */
export function VitalsProvider({ children }) {
  const listeners = useRef(new Set());
  const vitals = useVitals((side) => listeners.current.forEach((fn) => fn(side)));
  const subscribe = useCallback((fn) => {
    listeners.current.add(fn);
    return () => listeners.current.delete(fn);
  }, []);
  return <Ctx.Provider value={{ vitals, subscribe }}>{children}</Ctx.Provider>;
}

export const useLive = () => useContext(Ctx).vitals;

/** Calls fn('buy'|'sell') on every trade. */
export function useBeat(fn) {
  const { subscribe } = useContext(Ctx);
  const ref = useRef(fn);
  ref.current = fn;
  useEffect(() => subscribe((side) => ref.current(side)), [subscribe]);
}
