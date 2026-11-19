'use client';

import { useEffect, useRef, useState } from 'react';
import Logo from './Logo';
import { useLive } from './VitalsProvider';
import { site, STATUS, NAV_LINKS } from '@/lib/site';


const XIcon = () => (
  <svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true"><path fill="currentColor" d="M18.9 2H22l-7.2 8.2L23 22h-6.6l-5.2-6.8L5.3 22H2.2l7.7-8.8L1.9 2h6.8l4.7 6.2L18.9 2Zm-1.2 18h1.8L7.4 3.9H5.5L17.7 20Z" /></svg>
);

function Buy({ className = '' }) {
  return site.buyUrl ? (
    <a className={`nbtn nbtn-buy ${className}`} href={site.buyUrl} target="_blank" rel="noopener noreferrer">Buy {site.ticker}</a>
  ) : (
    <a className={`nbtn nbtn-buy ${className}`} href={site.xUrl} target="_blank" rel="noopener noreferrer">Launching soon</a>
  );
}

/** Floating navbar: scroll-spy on desktop, full-screen menu on phones, live pulse in the brand. */
export default function Nav() {
  const v = useLive();
  const st = STATUS[v.status] || STATUS.HEALTHY;
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState('');
  const [scrolled, setScrolled] = useState(false);
  const bar = useRef(null);

  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 24);
      const max = document.documentElement.scrollHeight - window.innerHeight;
      if (bar.current) bar.current.style.transform = `scaleX(${max > 0 ? window.scrollY / max : 0})`;
      let cur = '';
      for (const l of NAV_LINKS) {
        const el = document.getElementById(l.id);
        if (el && el.getBoundingClientRect().top < window.innerHeight * 0.35) cur = l.id;
      }
      setActive(cur);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle('menu-open', open);
    const onKey = (e) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <header className={`nav2 ${scrolled ? 'is-scrolled' : ''} ${open ? 'is-open' : ''}`}>
      <div className="nav2-inner">
        <a href="#top" className="nav2-brand" onClick={() => setOpen(false)}>
          <span className="nav2-logo"><Logo size={30} id="nav2" /><i className="nav2-beat" style={{ background: st.screen }} /></span>
          <span className="nav2-name">LASTBREATH</span>
        </a>

        <nav className="nav2-links" aria-label="Sections">
          {NAV_LINKS.map((l) => (
            <a key={l.id} href={`#${l.id}`} className={active === l.id ? 'on' : ''}>{l.label}</a>
          ))}
        </nav>

        <div className="nav2-actions">
          <a className="nav2-icon" href={site.xUrl} target="_blank" rel="noopener noreferrer" aria-label="Lastbreath on X"><XIcon /></a>
          <Buy className="hide-sm" />
          <button type="button" className="nav2-burger" aria-label={open ? 'Close menu' : 'Open menu'} aria-expanded={open} onClick={() => setOpen((o) => !o)}>
            <span /><span />
          </button>
        </div>
        <span ref={bar} className="nav2-progress" aria-hidden="true" />
      </div>

      <div className="nav2-menu" aria-hidden={!open}>
        <ol>
          {NAV_LINKS.map((l, i) => (
            <li key={l.id} style={{ transitionDelay: open ? `${80 + i * 45}ms` : '0ms' }}>
              <a href={`#${l.id}`} onClick={() => setOpen(false)} tabIndex={open ? 0 : -1}>
                <span className="mono">{String(i + 1).padStart(2, '0')}</span>
                {l.label}
                <span className="nav2-arrow" aria-hidden="true">→</span>
              </a>
            </li>
          ))}
        </ol>
        <div className="nav2-menu-foot">
          <div className="nav2-live mono">
            <i style={{ background: st.screen }} /> {st.label.toUpperCase()} · {v.bpm} TRADES/H
          </div>
          <div className="nav2-menu-cta">
            <Buy />
            <a className="nbtn nbtn-ghost" href={site.xUrl} target="_blank" rel="noopener noreferrer" tabIndex={open ? 0 : -1}><XIcon /> {site.xHandle}</a>
          </div>
        </div>
      </div>
    </header>
  );
}
