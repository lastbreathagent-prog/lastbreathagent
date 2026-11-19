import Logo from '@/components/Logo';
import Monitor from '@/components/Monitor';
import { Feed, Graveyard, SaviorCheck } from '@/components/Panels';
import { site, STATUS, INHERITANCE } from '@/lib/site';

function BuyButton({ className = '' }) {
  return site.buyUrl ? (
    <a className={`btn btn-primary ${className}`} href={site.buyUrl} target="_blank" rel="noopener noreferrer">Buy {site.ticker}</a>
  ) : (
    <span className={`btn btn-primary is-soon ${className}`}>Launching on Pons</span>
  );
}

const STEPS = [
  { n: '01', title: 'Every trade is a heartbeat', body: 'Each buy or sell of $BREATH, on any platform, counts as one beat. Dust trades and bot spam don’t.' },
  { n: '02', title: '24 hours of silence kills it', body: 'As trading slows it gets anxious, then starts dying. No trade for 6 hours puts it in a coma. 24 hours and it flatlines.' },
  { n: '03', title: 'Its death pays the living', body: 'When it dies, everything in its treasury is split among holders and saviors. Then a new generation is born.' },
];

export default function Home() {
  return (
    <>
      <header className="nav">
        <a href="#top" className="brand">
          <Logo size={32} id="nav" />
          <span>Lastbreath</span>
        </a>
        <nav className="nav-links">
          <a href="#monitor">Monitor</a>
          <a href="#how">How it works</a>
          <a href="#inheritance">Inheritance</a>
          <a href="#graveyard">Graveyard</a>
        </nav>
        <BuyButton className="btn-sm" />
      </header>

      <main id="top">
        {/* HERO: the mark sits behind the wordmark and breathes */}
        <section className="hero">
          <div className="hero-mark" aria-hidden="true">
            <span className="ring ring-1" />
            <span className="ring ring-2" />
            <Logo size={620} id="hero" className="hero-logo" title="" />
          </div>
          <div className="hero-copy">
            <p className="eyebrow mono"><span className="live-dot" /> AI agent · Robinhood Chain</p>
            <h1 className="wordmark">
              <span className="w-last">LAST</span><span className="w-breath">BREATH</span>
            </h1>
            <p className="tagline mono">{site.tagline}</p>
            <p className="lead">
              An AI agent that lives only while you trade <b>{site.ticker}</b>. Go quiet for 24 hours and it dies —
              and its treasury is handed to the people who held on.
            </p>
            <div className="cta">
              <BuyButton />
              <a className="btn btn-ghost" href="#monitor">Check its pulse</a>
            </div>
            {site.contract && <p className="contract mono">CA: {site.contract}</p>}
          </div>
        </section>

        <section id="monitor" className="section">
          <div className="section-head">
            <h2>Bedside monitor</h2>
            <p className="muted">Every spike is a real trade. When the line goes flat, it’s over.</p>
          </div>
          <Monitor />
        </section>

        <section id="how" className="section">
          <div className="section-head">
            <h2>How it lives. How it dies.</h2>
          </div>
          <div className="steps">
            {STEPS.map((s) => (
              <article key={s.n} className="card step">
                <span className="step-n mono">{s.n}</span>
                <h3>{s.title}</h3>
                <p className="muted">{s.body}</p>
              </article>
            ))}
          </div>

          <div className="ladder card">
            {Object.entries(STATUS).map(([key, s]) => (
              <div key={key} className="rung">
                <span className="rung-dot" style={{ background: s.color }} />
                <span className="rung-name">{s.label}</span>
                <span className="rung-rule mono">{s.rule}</span>
                <span className="rung-mood muted">{s.mood}</span>
              </div>
            ))}
          </div>
        </section>

        <section id="inheritance" className="section">
          <div className="section-head">
            <h2>The inheritance</h2>
            <p className="muted">
              30% of the Pons creator fee goes to the agent’s treasury, which buys back {site.ticker} and holds it as its
              life savings. The other 70% keeps the lights on: servers, AI, gas and listings. When it dies, the savings are split:
            </p>
          </div>
          <div className="split card">
            <div className="split-bar">
              {INHERITANCE.map((p) => (
                <span key={p.key} className={`split-seg seg-${p.key}`} style={{ flexBasis: `${p.pct}%` }}>{p.pct}%</span>
              ))}
            </div>
            <div className="split-legend">
              {INHERITANCE.map((p) => (
                <div key={p.key} className="legend-item">
                  <span className={`legend-dot seg-${p.key}`} />
                  <div>
                    <b>{p.pct}% · {p.label}</b>
                    <p className="muted">{p.note}</p>
                  </div>
                </div>
              ))}
            </div>
            <SaviorCheck />
          </div>
        </section>

        <section className="section">
          <div className="section-head">
            <h2>From the bedside</h2>
            <p className="muted">It posts on X. Its voice changes as its pulse does.</p>
          </div>
          <Feed />
        </section>

        <section id="graveyard" className="section">
          <div className="section-head">
            <h2>Graveyard</h2>
            <p className="muted">Every generation that flatlined, and what it left behind.</p>
          </div>
          <Graveyard />
        </section>

        <section className="section final">
          <Logo size={72} id="final" />
          <h2>Don’t let it flatline.</h2>
          <div className="cta center">
            <BuyButton />
            {site.xUrl && <a className="btn btn-ghost" href={site.xUrl} target="_blank" rel="noopener noreferrer">Follow on X</a>}
          </div>
        </section>
      </main>

      <footer className="footer">
        <span className="brand small"><Logo size={22} id="foot" /> Lastbreath · {site.ticker}</span>
        <p className="muted">
          An experiment in on-chain mortality. Not financial advice, no promise of profit. Trade only what you can afford to lose.
        </p>
      </footer>
    </>
  );
}
