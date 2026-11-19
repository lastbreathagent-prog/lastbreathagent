'use client';

// Tiny hospital-monitor beep with WebAudio. Off until the user turns it on.
let ctx = null;
let enabled = false;
const subs = new Set();

export const isSoundOn = () => enabled;
export const onSoundChange = (fn) => { subs.add(fn); return () => subs.delete(fn); };

export function setSound(on) {
  enabled = on;
  if (on && !ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (AC) ctx = new AC();
  }
  if (on && ctx?.state === 'suspended') ctx.resume();
  subs.forEach((fn) => fn(on));
}

export function beep(side = 'buy') {
  if (!enabled || !ctx) return;
  const t = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.value = side === 'sell' ? 740 : 980;
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.exponentialRampToValueAtTime(0.18, t + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.14);
  osc.connect(gain).connect(ctx.destination);
  osc.start(t);
  osc.stop(t + 0.16);
}
