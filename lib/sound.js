'use client';

// Tiny hospital-monitor beep with WebAudio. Off until the user turns it on.
// iPhone notes: WebAudio is muted by the ring/silent switch unless the page plays as "media".
// We ask for the playback audio session and start a silent <audio> loop, which does that.
let ctx = null;
let enabled = false;
let keepAlive = null;
const subs = new Set();

export const isSoundOn = () => enabled;
export const onSoundChange = (fn) => { subs.add(fn); return () => subs.delete(fn); };

// 0.1s of silence as a WAV data URI.
function silentWav() {
  const n = 4410, buf = new ArrayBuffer(44 + n * 2), v = new DataView(buf);
  const s = (o, str) => [...str].forEach((c, i) => v.setUint8(o + i, c.charCodeAt(0)));
  s(0, 'RIFF'); v.setUint32(4, 36 + n * 2, true); s(8, 'WAVEfmt '); v.setUint32(16, 16, true);
  v.setUint16(20, 1, true); v.setUint16(22, 1, true); v.setUint32(24, 44100, true); v.setUint32(28, 88200, true);
  v.setUint16(32, 2, true); v.setUint16(34, 16, true); s(36, 'data'); v.setUint32(40, n * 2, true);
  let bin = ''; new Uint8Array(buf).forEach((b) => (bin += String.fromCharCode(b)));
  return 'data:audio/wav;base64,' + btoa(bin);
}

function unlockMedia() {
  try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch { /* not supported */ }
  try {
    if (!keepAlive) {
      keepAlive = new Audio(silentWav());
      keepAlive.loop = true;
      keepAlive.setAttribute('playsinline', '');
    }
    keepAlive.play().catch(() => {});
  } catch { /* ignore */ }
}

export function setSound(on) {
  enabled = on;
  if (on) {
    unlockMedia(); // must run inside the tap
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (AC) ctx = new AC();
    }
    if (ctx?.state !== 'running') ctx?.resume?.().catch(() => {});
    beep('buy'); // instant feedback so you know it works
  } else {
    keepAlive?.pause();
  }
  subs.forEach((fn) => fn(on));
}

export function beep(side = 'buy') {
  if (!enabled || !ctx) return;
  if (ctx.state === 'suspended') ctx.resume().catch(() => {});
  const t = ctx.currentTime + 0.01;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.value = side === 'sell' ? 740 : 980;
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.exponentialRampToValueAtTime(0.3, t + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.16);
  osc.connect(gain).connect(ctx.destination);
  osc.start(t);
  osc.stop(t + 0.18);
}
