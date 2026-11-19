'use client';

import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';

const TEMPO = { HEALTHY: 4.5, ANXIOUS: 2.4, DYING: 7, COMA: 12, DEAD: 0 };

// ---------- shapes ----------
// Every shape is drawn once on a small offscreen canvas and sampled into points,
// so the particles can morph into a recognizable picture for each section.
const S = 400; // drawing box
const ekg = (ctx, x0, x1, y, amp) => {
  const w = x1 - x0;
  ctx.beginPath();
  ctx.moveTo(x0, y);
  ctx.lineTo(x0 + w * 0.3, y);
  ctx.lineTo(x0 + w * 0.35, y - amp * 0.15);
  ctx.lineTo(x0 + w * 0.4, y);
  ctx.lineTo(x0 + w * 0.44, y);
  ctx.lineTo(x0 + w * 0.48, y - amp);
  ctx.lineTo(x0 + w * 0.53, y + amp * 0.75);
  ctx.lineTo(x0 + w * 0.57, y - amp * 0.2);
  ctx.lineTo(x0 + w * 0.62, y);
  ctx.lineTo(x0 + w * 0.67, y - amp * 0.22);
  ctx.lineTo(x0 + w * 0.72, y);
  ctx.lineTo(x1, y);
  ctx.stroke();
};
const rr = (ctx, x, y, w, h, r) => {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
};

const DRAW = {
  // the logo: breath orb with the pulse running through it
  logo(ctx) {
    ctx.lineWidth = 12;
    ctx.beginPath(); ctx.arc(200, 200, 112, 0, Math.PI * 2); ctx.stroke();
    ctx.lineWidth = 11;
    ctx.beginPath();
    [[30, 208], [118, 208], [128, 196], [138, 208], [146, 208], [160, 128], [178, 268], [192, 208], [204, 208], [218, 190], [232, 208], [370, 208]]
      .forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.stroke();
  },
  // a bedside monitor with a heartbeat on screen
  monitor(ctx) {
    ctx.lineWidth = 12;
    rr(ctx, 50, 80, 300, 200, 24); ctx.stroke();
    ctx.lineWidth = 8;
    ekg(ctx, 78, 322, 190, 70);
    ctx.fillRect(186, 280, 28, 36);
    rr(ctx, 130, 314, 140, 16, 8); ctx.fill();
    ctx.beginPath(); ctx.arc(312, 110, 8, 0, Math.PI * 2); ctx.fill();
  },
  // a heart with a pulse inside
  heart(ctx) {
    ctx.lineWidth = 13;
    ctx.beginPath();
    ctx.moveTo(200, 330);
    ctx.bezierCurveTo(60, 240, 40, 150, 90, 105);
    ctx.bezierCurveTo(135, 65, 190, 85, 200, 135);
    ctx.bezierCurveTo(210, 85, 265, 65, 310, 105);
    ctx.bezierCurveTo(360, 150, 340, 240, 200, 330);
    ctx.closePath();
    ctx.stroke();
    ctx.lineWidth = 7;
    ekg(ctx, 100, 300, 200, 55);
  },
  // the inheritance split: 70 / 20 / 10
  donut(ctx) {
    ctx.lineWidth = 40;
    const gap = 0.16, start = -Math.PI / 2;
    [[0, 0.7], [0.7, 0.9], [0.9, 1]].forEach(([a, b]) => {
      ctx.beginPath();
      ctx.arc(200, 200, 120, start + a * Math.PI * 2 + gap, start + b * Math.PI * 2 - gap);
      ctx.stroke();
    });
  },
  // a coin for the money section
  coin(ctx) {
    ctx.lineWidth = 12;
    ctx.beginPath(); ctx.arc(200, 200, 130, 0, Math.PI * 2); ctx.stroke();
    ctx.lineWidth = 5;
    ctx.beginPath(); ctx.arc(200, 200, 106, 0, Math.PI * 2); ctx.stroke();
    ctx.font = '900 170px Arial, Helvetica, sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('$', 200, 210);
  },
  // a chat bubble for its posts
  chat(ctx) {
    ctx.lineWidth = 12;
    rr(ctx, 55, 85, 290, 190, 46); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(120, 272); ctx.lineTo(100, 330); ctx.lineTo(170, 274); ctx.stroke();
    [140, 200, 260].forEach((x) => { ctx.beginPath(); ctx.arc(x, 180, 16, 0, Math.PI * 2); ctx.fill(); });
  },
  // a gravestone over a flatline
  tomb(ctx) {
    ctx.lineWidth = 12;
    ctx.beginPath();
    ctx.moveTo(115, 320); ctx.lineTo(115, 170); ctx.arc(200, 170, 85, Math.PI, 0); ctx.lineTo(285, 320);
    ctx.stroke();
    ctx.font = '900 64px Arial, Helvetica, sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('RIP', 200, 210);
    ctx.lineWidth = 9;
    ctx.beginPath(); ctx.moveTo(30, 324); ctx.lineTo(370, 324); ctx.stroke();
  },
  // a road with three stops for the roadmap
  road(ctx) {
    ctx.lineWidth = 10;
    ctx.beginPath(); ctx.moveTo(60, 300); ctx.bezierCurveTo(140, 300, 120, 200, 200, 200); ctx.bezierCurveTo(280, 200, 260, 100, 340, 100); ctx.stroke();
    [[60, 300], [200, 200], [340, 100]].forEach(([x, y]) => { ctx.beginPath(); ctx.arc(x, y, 26, 0, Math.PI * 2); ctx.fill(); });
  },
  // a question mark for the FAQ
  question(ctx) {
    ctx.font = '900 330px Arial, Helvetica, sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('?', 200, 215);
  },
};

function sampleShape(name, n) {
  const off = document.createElement('canvas');
  off.width = S; off.height = S;
  const ctx = off.getContext('2d');
  ctx.strokeStyle = '#fff'; ctx.fillStyle = '#fff'; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  DRAW[name](ctx);
  const data = ctx.getImageData(0, 0, S, S).data;
  const pool = [];
  for (let y = 0; y < S; y += 2) for (let x = 0; x < S; x += 2) if (data[(y * S + x) * 4 + 3] > 128) pool.push(x, y);
  const out = new Array(n);
  const count = pool.length / 2;
  for (let i = 0; i < n; i++) {
    const k = Math.floor(Math.random() * count) * 2;
    out[i] = { x: (pool[k] - 200) / 150 + (Math.random() - 0.5) * 0.02, y: (pool[k + 1] - 200) / 150 + (Math.random() - 0.5) * 0.02, z: (Math.random() - 0.5) * 0.12 };
  }
  return out;
}

const SPIN = { sphere: 1 }; // only the sphere spins freely; pictures face you and sway

/**
 * Particles (2D canvas, no WebGL). In the hero they form a breathing sphere; as you
 * scroll, they follow the page and morph into a picture for each section:
 * monitor, heart, inheritance split, coin, logo, chat, gravestone, road, question mark.
 * pulse(side) sends a shockwave through whatever shape is showing.
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
    let w = 0, h = 0, dpr = 1, raf = 0, last = performance.now(), clock = 0;
    let pts = [];
    let shapes = {};
    let current = 'sphere';
    let spinW = 1;
    let rotY = 0, tiltX = -0.25, tiltY = 0, aimX = -0.25, aimY = 0;
    let breathPhase = 0, thump = 0;
    const pointer = { x: -9999, y: -9999, on: false };
    const lerp = (a, b, t) => a + (b - a) * t;

    const build = () => {
      const n = w < 640 ? 1000 : 1800;
      const sphere = [];
      const golden = Math.PI * (3 - Math.sqrt(5));
      for (let i = 0; i < n; i++) {
        const y = 1 - (i / (n - 1)) * 2;
        const r = Math.sqrt(1 - y * y);
        const th = golden * i;
        sphere.push({ x: Math.cos(th) * r, y, z: Math.sin(th) * r });
      }
      shapes = { sphere };
      for (const name of Object.keys(DRAW)) shapes[name] = sampleShape(name, n);
      pts = sphere.map((s) => ({ cx: s.x, cy: s.y, cz: s.z, j: 0.94 + Math.random() * 0.12, k: 0.035 + Math.random() * 0.06, ox: 0, oy: 0 }));
    };

    const resize = () => {
      w = c.clientWidth;
      h = c.clientHeight;
      dpr = Math.min(window.devicePixelRatio || 1, w < 640 ? 1.5 : 2);
      c.width = w * dpr;
      c.height = h * dpr;
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (!pts.length || (pts.length > 1000) !== (w >= 640)) build();
    };
    resize();
    window.addEventListener('resize', resize);

    const move = (e) => {
      const p = e.touches ? e.touches[0] : e;
      pointer.x = p.clientX;
      pointer.y = p.clientY;
      pointer.on = true;
      aimY = ((pointer.x / w) - 0.5) * 0.9;
      aimX = -0.25 + ((pointer.y / h) - 0.5) * 0.7;
    };
    const leave = () => { pointer.on = false; aimX = -0.25; aimY = 0; };
    window.addEventListener('pointermove', move, { passive: true });
    window.addEventListener('touchmove', move, { passive: true });
    document.addEventListener('pointerleave', leave);

    let lastScroll = window.scrollY, spinBoost = 0;

    // Which picture to show: the section whose heading is closest to the upper-middle of the screen.
    // The picture is anchored next to that heading (to its right on desktop), where there is free space.
    const pick = () => {
      let best = null, bestD = Infinity;
      for (const el of document.querySelectorAll('[data-orb]')) {
        const head = el.querySelector('.section-head') || el;
        const r = head.getBoundingClientRect();
        if (r.bottom < 0 || r.top > h) continue;
        const d = Math.abs(r.top + r.height / 2 - h * 0.42);
        if (d < bestD) { bestD = d; best = { el, r }; }
      }
      if (!best) return { name: 'sphere', anchor: null };
      const name = best.el.getAttribute('data-orb');
      return { name: shapes[name] ? name : 'sphere', anchor: best.el.classList.contains('hero') ? null : best };
    };
    let posX = null, posY = null;

    function frame(now) {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      clock += dt;
      const tempo = TEMPO[statusRef.current] ?? 4.5;
      if (tempo && !reduce) breathPhase += (dt / tempo) * Math.PI * 2;

      const scrollY = window.scrollY;
      const vel = scrollY - lastScroll;
      lastScroll = scrollY;
      if (!reduce) spinBoost += vel * 0.0025;
      spinBoost *= 0.92;
      if (!reduce) rotY += dt * (statusRef.current === 'DEAD' ? 0.02 : 0.18) + spinBoost * 0.08;
      tiltX += (aimX - tiltX) * 0.04;
      tiltY += (aimY - tiltY) * 0.04;

      const picked = pick();
      current = picked.name;
      const target = shapes[current];
      spinW += ((SPIN[current] ?? 0) - spinW) * 0.06;

      for (const wv of waves.current) wv.t += dt;
      waves.current = waves.current.filter((wv) => wv.t < 1.6);
      if (waves.current.length) thump = Math.max(thump, 1);
      thump *= 0.9;

      // Follow the page: big and centred in the hero, then it shrinks and settles
      // (to the right on desktop) and keeps breathing behind the content.
      const mobile = w < 760;
      const heroEl = document.querySelector('.hero');
      const hr = heroEl ? heroEl.getBoundingClientRect() : { top: 0, height: h };
      const prog = Math.max(0, Math.min(1, scrollY / (hr.height * 0.75)));
      const e = prog * prog * (3 - 2 * prog);
      const R = Math.min(w, h) * (mobile ? 0.42 : 0.36) * lerp(1, mobile ? 0.5 : 0.46, e);
      const breath = 1 + Math.sin(breathPhase) * 0.045 + thump * 0.035;
      // where the hero wants it vs where the current section wants it
      const heroX = w / 2, heroY = hr.top + hr.height * 0.46;
      let secX = mobile ? w / 2 : w * 0.78, secY = h * 0.5;
      if (picked.anchor) {
        const sr = picked.anchor.el.getBoundingClientRect();
        const half = 1.4 * R * 0.62;
        secX = mobile ? w - half - 6 : Math.min(w - half - 16, sr.right - 32 - half);
        secY = picked.anchor.r.top + picked.anchor.r.height / 2;
      }
      const wantX = lerp(heroX, secX, e), wantY = lerp(heroY, secY, e);
      if (posX === null) { posX = wantX; posY = wantY; }
      const follow = e < 0.98 ? 1 : 0.16; // glide between sections, stick while scrolling the hero
      posX += (wantX - posX) * follow;
      posY += (wantY - posY) * follow;
      const cx = posX, cy = posY;
      const fade = lerp(1, mobile ? 0.34 : 0.7, e);

      // full spin for the sphere, a gentle sway for the pictures
      const sway = reduce ? 0 : Math.sin(clock * 0.7) * 0.32 + tiltY * 0.5;
      const aR = rotY + tiltY, aS = sway;
      const cR = Math.cos(aR), sR = Math.sin(aR), cS = Math.cos(aS), sS = Math.sin(aS);
      const cxR = Math.cos(tiltX), sxR = Math.sin(tiltX);
      const tX = lerp(0, tiltX, spinW), cxS = Math.cos(tX * 0.4), sxS = Math.sin(tX * 0.4);
      const dying = statusRef.current === 'DYING' || statusRef.current === 'COMA';

      g.clearRect(0, 0, w, h);

      const glow = g.createRadialGradient(cx, cy, 0, cx, cy, R * 1.25);
      glow.addColorStop(0, `rgba(80,130,255,${(0.32 + thump * 0.2) * (1 - e * 0.75)})`);
      glow.addColorStop(0.55, `rgba(31,91,255,${0.1 * (1 - e * 0.6)})`);
      glow.addColorStop(1, 'rgba(31,91,255,0)');
      g.fillStyle = glow;
      g.fillRect(0, 0, w, h);

      for (let i = 0; i < pts.length; i++) {
        const p = pts[i];
        const t = target[i];
        // morph toward the section's picture
        p.cx += (t.x - p.cx) * p.k;
        p.cy += (t.y - p.cy) * p.k;
        p.cz += (t.z - p.cz) * p.k;

        // spinning version
        let x1 = p.cx * cR - p.cz * sR;
        let z1 = p.cx * sR + p.cz * cR;
        let y1 = p.cy * cxR - z1 * sxR;
        z1 = p.cy * sxR + z1 * cxR;
        // swaying version
        let x2 = p.cx * cS - p.cz * sS;
        let z2 = p.cx * sS + p.cz * cS;
        let y2 = p.cy * cxS - z2 * sxS;
        z2 = p.cy * sxS + z2 * cxS;

        const x = lerp(x2, x1, spinW), y = lerp(y2, y1, spinW), z = lerp(z2, z1, spinW);

        let push = 0;
        for (const wv of waves.current) {
          const front = wv.t * 1.9;
          const d = Math.abs((1 - z) - front);
          push += Math.exp(-d * d * 18) * (1 - wv.t / 1.6) * (wv.side === 'sell' ? -0.12 : 0.22);
        }

        const rad = R * breath * lerp(1, p.j, spinW) * (1 + push) * (dying ? 0.97 + Math.random() * 0.02 : 1);
        const persp = 1.6 / (2.6 - z);
        let sx = cx + x * rad * persp;
        let sy = cy + y * rad * persp;

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

        const depth = Math.max(0, Math.min(1, (z + 1) / 2));
        const flatBoost = 1 - spinW; // pictures read better a touch bigger and brighter
        const size = (0.7 + depth * 1.7 + flatBoost * 0.6) * (mobile ? 1.1 : 1);
        const a = Math.min(1, (0.18 + depth * 0.82 + flatBoost * 0.25)) * fade;
        const light = 170 + depth * 85;
        const r = Math.round(lerp(light - 60, 31 + depth * 30, e));
        const gg = Math.round(lerp(light - 20, 91 + depth * 30, e));
        g.fillStyle = push > 0.05 && e < 0.5 ? `rgba(255,255,255,${a})` : `rgba(${r},${gg},255,${a})`;
        g.fillRect(sx - size / 2, sy - size / 2, size, size);
      }

      raf = requestAnimationFrame(frame);
    }
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      window.removeEventListener('pointermove', move);
      window.removeEventListener('touchmove', move);
      document.removeEventListener('pointerleave', leave);
    };
  }, []);

  return <canvas ref={canvas} className="orb-canvas" aria-hidden="true" />;
});

export default ParticleOrb;
