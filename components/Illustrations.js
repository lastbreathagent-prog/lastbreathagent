// Small animated illustrations for the feature cards (pure SVG + CSS/SMIL, no JS).

/** Many trades (buys and sells) merge into one heartbeat line. */
export function MergeArt() {
  const a = 'M8 22 C 80 22, 110 60, 168 60';
  const b = 'M8 60 L 168 60';
  const c = 'M8 98 C 80 98, 110 60, 168 60';
  const out = 'M168 60 H230 l6 -8 l6 8 h6 l6 -34 l8 58 l6 -24 h10 l6 -8 l6 8 H352';
  return (
    <svg className="art" viewBox="0 0 360 120" aria-hidden="true">
      <path d={a} className="art-line l1" />
      <path d={b} className="art-line l2" />
      <path d={c} className="art-line l3" />
      <path d={out} className="art-out" />
      <path d={out} className="art-out-run" pathLength="1" />
      <circle r="4" className="art-dot d1"><animateMotion dur="2.6s" repeatCount="indefinite" path={a} /></circle>
      <circle r="4" className="art-dot d2"><animateMotion dur="2.1s" begin="-0.8s" repeatCount="indefinite" path={b} /></circle>
      <circle r="4" className="art-dot d3"><animateMotion dur="2.9s" begin="-1.6s" repeatCount="indefinite" path={c} /></circle>
      <circle cx="168" cy="60" r="6" className="art-node" />
    </svg>
  );
}

/** Trades per hour falling toward the flatline. */
export function FadingBars() {
  const bars = [92, 74, 80, 52, 38, 22, 9];
  return (
    <div className="bars" aria-hidden="true">
      <span className="bars-limit mono">FLATLINE · 24H OF SILENCE</span>
      {bars.map((v, i) => (
        <span key={i} className={`bar ${i === bars.length - 1 ? 'bar-last' : ''}`} style={{ '--h': `${v}%`, animationDelay: `${i * 0.12}s` }} />
      ))}
    </div>
  );
}

/** The treasury splits three ways on death: 70 / 20 / 10. */
export function SplitArt() {
  const top = 'M150 60 C 200 60, 220 22, 300 22';
  const mid = 'M150 60 L 300 60';
  const bot = 'M150 60 C 200 60, 220 98, 300 98';
  return (
    <svg className="art" viewBox="0 0 360 120" aria-hidden="true">
      <path d="M8 60 L150 60" className="art-out" />
      <path d="M8 60 L150 60" className="art-out-run" pathLength="1" />
      <path d={top} className="art-line l1 thick" />
      <path d={mid} className="art-line l2" />
      <path d={bot} className="art-line l3 thin" />
      <circle cx="150" cy="60" r="7" className="art-node" />
      <circle r="4" className="art-dot d1"><animateMotion dur="2.4s" repeatCount="indefinite" path={top} /></circle>
      <circle r="3.5" className="art-dot d2"><animateMotion dur="2.4s" begin="-0.8s" repeatCount="indefinite" path={mid} /></circle>
      <circle r="3" className="art-dot d3"><animateMotion dur="2.4s" begin="-1.6s" repeatCount="indefinite" path={bot} /></circle>
      <text x="310" y="26" className="art-label">70%</text>
      <text x="310" y="64" className="art-label">20%</text>
      <text x="310" y="102" className="art-label">10%</text>
    </svg>
  );
}
