'use client';

import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';

// Heart rhythm per status: visual rate (beats/min), spike height (0-1).
const RHYTHM = {
  HEALTHY: { rate: 72, amp: 1 },
  ANXIOUS: { rate: 108, amp: 0.75 },
  DYING: { rate: 42, amp: 0.45 },
  COMA: { rate: 18, amp: 0.15 },
  DEAD: { rate: 0, amp: 0 },
};

// One PQRST complex sampled at phase p in [0,1).
function complex(p) {
  if (p < 0.1) return Math.sin((p / 0.1) * Math.PI) * 0.12; // P
  if (p < 0.16) return 0;
  if (p < 0.19) return -((p - 0.16) / 0.03) * 0.15; // Q
  if (p < 0.23) return -0.15 + ((p - 0.19) / 0.04) * 1.15; // R up
  if (p < 0.28) return 1 - ((p - 0.23) / 0.05) * 1.35; // down to S
  if (p < 0.32) return -0.35 + ((p - 0.28) / 0.04) * 0.35; // back
  if (p < 0.42) return 0;
  if (p < 0.6) return Math.sin(((p - 0.42) / 0.18) * Math.PI) * 0.22; // T
  return 0;
}

/** Scrolling heart monitor. Call ref.current.trade('buy'|'sell') to add a big trade spike. */
const Ekg = forwardRef(function Ekg({ status = 'HEALTHY', color = '#1f5bff', height = 160, grid = 'rgba(31,91,255,0.08)' }, ref) {
  const canvas = useRef(null);
  const statusRef = useRef(status);
  const colorRef = useRef(color);
  const gridRef = useRef(grid);
  gridRef.current = grid;
  const spikes = useRef([]);
  statusRef.current = status;
  colorRef.current = color;

  useImperativeHandle(ref, () => ({
    trade(side) { spikes.current.push({ x: null, side }); },
  }));

  useEffect(() => {
    const c = canvas.current;
    const ctx = c.getContext('2d');
    let raf;
    let w = 0;
    let h = 0;
    let points = [];
    let phase = 0;
    let last = performance.now();
    const speed = 90; // px per second

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = c.clientWidth;
      h = c.clientHeight;
      c.width = w * dpr;
      c.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      // Keep the trace when the size changes (iOS fires resize as the URL bar collapses).
      const n = Math.ceil(w);
      points = points.length >= n ? points.slice(points.length - n) : new Array(n - points.length).fill(0).concat(points);
    };
    resize();
    window.addEventListener('resize', resize);

    const frame = (now) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const r = RHYTHM[statusRef.current] || RHYTHM.HEALTHY;
      const steps = Math.max(1, Math.round(speed * dt));
      for (let i = 0; i < steps; i++) {
        phase += (r.rate / 60) / speed;
        if (phase >= 1) phase -= 1;
        let y = r.rate ? complex(phase) * r.amp : 0;
        y += (Math.random() - 0.5) * 0.015; // tiny noise
        // A pending trade becomes a tall extra spike right now.
        const s = spikes.current.find((k) => k.x === null);
        if (s) { s.x = 0; s.t = 0; }
        for (const k of spikes.current) {
          if (k.x === null) continue;
          k.t += 1;
          const q = k.t / 26;
          if (q < 1) y += (q < 0.4 ? q / 0.4 : 1 - (q - 0.4) / 0.6) * (k.side === 'sell' ? -0.8 : 1.15);
        }
        spikes.current = spikes.current.filter((k) => k.x === null || k.t < 26);
        points.push(y);
        points.shift();
      }

      ctx.clearRect(0, 0, w, h);
      // grid
      ctx.strokeStyle = gridRef.current;
      ctx.lineWidth = 1;
      for (let x = 0; x < w; x += 24) { ctx.beginPath(); ctx.moveTo(x + 0.5, 0); ctx.lineTo(x + 0.5, h); ctx.stroke(); }
      for (let y = 0; y < h; y += 24) { ctx.beginPath(); ctx.moveTo(0, y + 0.5); ctx.lineTo(w, y + 0.5); ctx.stroke(); }

      // trace, fading toward the left
      const mid = h * 0.58;
      const scale = h * 0.42;
      const grad = ctx.createLinearGradient(0, 0, w, 0);
      grad.addColorStop(0, 'rgba(255,255,255,0)');
      grad.addColorStop(0.25, colorRef.current);
      grad.addColorStop(1, colorRef.current);
      ctx.strokeStyle = grad;
      ctx.lineWidth = 2.5;
      ctx.lineJoin = 'round';
      ctx.shadowColor = colorRef.current;
      ctx.shadowBlur = 12;
      ctx.beginPath();
      points.forEach((y, x) => (x ? ctx.lineTo(x, mid - y * scale) : ctx.moveTo(x, mid - y * scale)));
      ctx.stroke();
      ctx.shadowBlur = 0;
      // head dot
      const hy = mid - points[points.length - 1] * scale;
      ctx.fillStyle = colorRef.current;
      ctx.beginPath();
      ctx.arc(w - 3, hy, 3.5, 0, Math.PI * 2);
      ctx.fill();

      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', resize); };
  }, []);

  return <canvas ref={canvas} style={{ width: '100%', height: `var(--ekg-h, ${height}px)`, display: 'block' }} aria-hidden="true" />;
});

export default Ekg;
