'use client';

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import ParticleOrb from './ParticleOrb';
import { useBeat, useLive } from './VitalsProvider';
import { beep, isSoundOn, onSoundChange, setSound } from '@/lib/sound';

const OrbCtx = createContext(() => {});

/** Dark hero stage: the particle orb behind the copy. Every trade pulses the orb (and beeps if sound is on). */
export default function HeroScene({ children }) {
  const orb = useRef(null);
  const v = useLive();
  useBeat((side) => { orb.current?.pulse(side); beep(side); });
  const pulse = useCallback(() => {
    orb.current?.pulse('buy');
    beep('buy');
    navigator.vibrate?.(30);
  }, []);
  return (
    <OrbCtx.Provider value={pulse}>
      <div className="scene">
        <div className="scene-orb" onPointerDown={pulse}>
          <ParticleOrb ref={orb} status={v.status} />
        </div>
        {children}
      </div>
    </OrbCtx.Provider>
  );
}

export function PulseButton() {
  const pulse = useContext(OrbCtx);
  const [n, setN] = useState(0);
  return (
    <button type="button" className="btn btn-glass" onClick={() => { pulse(); setN((x) => x + 1); }}>
      <span key={n} className="hs-heart">♥</span> Feel its pulse
    </button>
  );
}

export function SoundToggle() {
  const [on, setOn] = useState(false);
  useEffect(() => { setOn(isSoundOn()); return onSoundChange(setOn); }, []);
  return (
    <button type="button" className={`sound-toggle mono ${on ? 'is-on' : ''}`} onClick={() => setSound(!on)} aria-pressed={on}>
      <span className="sound-bars" aria-hidden="true"><i /><i /><i /></span>
      {on ? 'Heartbeat sound on' : 'Heartbeat sound off'}
    </button>
  );
}

/** Thin progress line under the nav. */
export function ScrollProgress() {
  const bar = useRef(null);
  useEffect(() => {
    const onScroll = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      if (bar.current) bar.current.style.transform = `scaleX(${max > 0 ? window.scrollY / max : 0})`;
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  return <span ref={bar} className="scroll-progress" aria-hidden="true" />;
}
