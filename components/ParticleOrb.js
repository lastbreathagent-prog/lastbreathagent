'use client';

import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';

const TEMPO = { HEALTHY: 4.5, ANXIOUS: 2.4, DYING: 7, COMA: 12, DEAD: 0 };

/**
 * A breathing sphere of particles (2D canvas, no WebGL needed).
 * - breathes at a tempo set by the agent's status
 * - rotates and tilts toward the pointer / finger; nearby particles get pushed away
 * - pulse(side) sends a shockwave through the sphere (on every trade or a tap)
 */
const ParticleOrb = forwardRef(function ParticleOrb({ status = 'HEALTHY' }, ref) {
  const canvas = useRef(null);
  const statusRef = useRef(status);
  statusRef.current = status;
  const waves = useRef([]);

  useImperativeHandle(ref, () => ({
    pulse(side = 'buy') { waves.current.push({ t: 0, side }); },
  }));

  useEffect(() => {
    const c = canvas.current;
    const g = c.getContext('2d');
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    let w = 0, h = 0, dpr = 1, raf = 0, visible = true, running = false, last = performance.now();
    const start = () => { if (running) return; running = true; last = performance.now(); raf = requestAnimationFrame(frame); };
    let pts = [];
    let rotY = 0, tiltX = -0.25, tiltY = 0, aimX = -0.25, aimY = 0;
    let breathPhase = 0, thump = 0;
    const pointer = { x: -9999, y: -9999, on: false };

    const build = () => {
      const n = w < 640 ? 900 : 1700;
      pts = [];
      const golden = Math.PI * (3 - Math.sqrt(5));
      for (let i = 0; i < n; i++) {
        const y = 1 - (i / (n - 1)) * 2;
        const r = Math.sqrt(1 - y * y);
        const th = golden * i;
        pts.push({ x: Math.cos(th) * r, y, z: Math.sin(th) * r, j: 0.92 + Math.random() * 0.16, ox: 0, oy: 0 });
      }
    };

    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, w < 640 ? 1.5 : 2);
      w = c.clientWidth;
      h = c.clientHeight;
      c.width = w * dpr;
      c.height = h * dpr;
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (!pts.length || (pts.length > 1000) !== (w >= 640)) build();
    };
    resize();
    window.addEventListener('resize', resize);

    const move = (e) => {
      const r = c.getBoundingClientRect();
      const p = e.touches ? e.touches[0] : e;
      pointer.x = p.clientX - r.left;
      pointer.y = p.clientY - r.top;
      pointer.on = true;
      aimY = ((pointer.x / w) - 0.5) * 0.9;
      aimX = -0.25 + ((pointer.y / h) - 0.5) * 0.7;
    };
    const leave = () => { pointer.on = false; aimX = -0.25; aimY = 0; };
    window.addEventListener('pointermove', move, { passive: true });
    window.addEventListener('touchmove', move, { passive: true });
    c.parentElement.addEventListener('pointerleave', leave);

    const io = typeof IntersectionObserver !== 'undefined'
      ? new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible) start(); })
      : null;
    io?.observe(c);

    function frame(now) {
      if (!visible) { running = false; return; }
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const tempo = TEMPO[statusRef.current] ?? 4.5;
      if (tempo && !reduce) breathPhase += (dt / tempo) * Math.PI * 2;
      if (!reduce) rotY += dt * (statusRef.current === 'DEAD' ? 0.02 : 0.18);
      tiltX += (aimX - tiltX) * 0.04;
      tiltY += (aimY - tiltY) * 0.04;

      for (const wv of waves.current) wv.t += dt;
      waves.current = waves.current.filter((wv) => wv.t < 1.6);
      if (waves.current.length) thump = Math.max(thump, 1);
      thump *= 0.9;

      const R = Math.min(w, h) * (w < 640 ? 0.42 : 0.36);
      const breath = 1 + Math.sin(breathPhase) * 0.045 + thump * 0.035;
      const cx = w / 2, cy = h / 2;
      const cyR = Math.cos(rotY + tiltY), syR = Math.sin(rotY + tiltY);
      const cxR = Math.cos(tiltX), sxR = Math.sin(tiltX);
      const dying = statusRef.current === 'DYING' || statusRef.current === 'COMA';

      g.clearRect(0, 0, w, h);

      // inner glow
      const glow = g.createRadialGradient(cx, cy, 0, cx, cy, R * 1.25);
      glow.addColorStop(0, `rgba(80,130,255,${0.32 + thump * 0.2})`);
      glow.addColorStop(0.55, 'rgba(31,91,255,0.10)');
      glow.addColorStop(1, 'rgba(31,91,255,0)');
      g.fillStyle = glow;
      g.fillRect(0, 0, w, h);

      for (const p of pts) {
        // rotate
        let x = p.x * cyR - p.z * syR;
        let z = p.x * syR + p.z * cyR;
        let y = p.y * cxR - z * sxR;
        z = p.y * sxR + z * cxR;

        // shockwaves travel from the front of the sphere outward
        let push = 0;
        for (const wv of waves.current) {
          const front = wv.t * 1.9; // distance travelled across the surface (0..~3)
          const d = Math.abs((1 - z) - front);
          push += Math.exp(-d * d * 18) * (1 - wv.t / 1.6) * (wv.side === 'sell' ? -0.12 : 0.22);
        }

        const rr = R * breath * p.j * (1 + push) * (dying ? 0.97 + Math.random() * 0.02 : 1);
        const persp = 1.6 / (2.6 - z);
        let sx = cx + x * rr * persp;
        let sy = cy + y * rr * persp;

        // pointer repulsion (eases back)
        if (pointer.on) {
          const dx = sx - pointer.x, dy = sy - pointer.y;
          const d2 = dx * dx + dy * dy;
          if (d2 < 9000) {
            const f = (1 - d2 / 9000) * 18;
            const d = Math.sqrt(d2) || 1;
            p.ox += (dx / d) * f * 0.25;
            p.oy += (dy / d) * f * 0.25;
          }
        }
        p.ox *= 0.9;
        p.oy *= 0.9;
        sx += p.ox;
        sy += p.oy;

        const depth = (z + 1) / 2; // 0 back .. 1 front
        const size = (0.7 + depth * 1.7) * (w < 640 ? 1.1 : 1);
        const a = 0.18 + depth * 0.82;
        const light = Math.round(170 + depth * 85);
        g.fillStyle = push > 0.05 ? `rgba(255,255,255,${a})` : `rgba(${light - 60},${light - 20},255,${a})`;
        g.fillRect(sx - size / 2, sy - size / 2, size, size);
      }

      raf = requestAnimationFrame(frame);
    }
    start();

    return () => {
      cancelAnimationFrame(raf);
      io?.disconnect();
      window.removeEventListener('resize', resize);
      window.removeEventListener('pointermove', move);
      window.removeEventListener('touchmove', move);
      c.parentElement?.removeEventListener('pointerleave', leave);
    };
  }, []);

  return <canvas ref={canvas} className="orb-canvas" aria-hidden="true" />;
});

export default ParticleOrb;
