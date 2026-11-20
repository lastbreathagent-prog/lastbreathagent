import Logo from '@/components/Logo';
import MobileBar from '@/components/MobileBar';
import StatusStack from '@/components/StatusStack';
import TokenFlow from '@/components/TokenFlow';
import InheritanceCard from '@/components/InheritanceCard';
import { MergeArt, FadingBars, SplitArt } from '@/components/Illustrations';
import Monitor from '@/components/Monitor';
import { VitalsProvider } from '@/components/VitalsProvider';
import { HeroStats, Ticker, Reveal } from '@/components/Live';
import HeroScene, { PulseButton, SoundToggle } from '@/components/HeroScene';
import Nav from '@/components/Nav';
import CopyCA from '@/components/CopyCA';
import { Feed, Graveyard } from '@/components/Panels';
import { site, STATUS, INHERITANCE, NAV_LINKS } from '@/lib/site';

// EKG path: `beats` complexes across `width`, spike height scaled by `amp`.
function ekgPath({ width, base, beats, amp, spike = 46 }) {
  if (!amp) return `M0 ${base} H${width}`;
  const step = width / beats;
  let d = `M0 ${base}`;
  for (let i = 0; i < beats; i++) {
    const x = i * step + step * 0.3;
    const h = spike * amp;
    d += ` H${x.toFixed(1)} l6 ${(-h * 0.14).toFixed(1)} l6 ${(h * 0.14).toFixed(1)} h5`;
    d += ` l5 ${(h * 0.12).toFixed(1)} l7 ${(-h * 1.12).toFixed(1)} l8 ${(h * 1.45).toFixed(1)} l6 ${(-h * 0.45).toFixed(1)}`;
    d += ` h10 l9 ${(-h * 0.22).toFixed(1)} l9 ${(h * 0.22).toFixed(1)}`;
  }
  return `${d} H${width}`;
}

const HERO_EKG = ekgPath({ width: 1600, base: 72, beats: 7, amp: 1 });

function BuyButton({ className = '' }) {
  return site.buyUrl ? (
    <a className={`btn btn-primary ${className}`} href={site.buyUrl} target="_blank" rel="noopener noreferrer">Buy {site.ticker}</a>
  ) : (
    <span className={`btn btn-primary is-soon ${className}`}>Launching on Pons</span>
  );
}

const STEPS = [
  { n: '01', tag: 'Trades → heartbeat', art: 'merge', title: 'Every trade is a heartbeat', body: 'Each buy or sell of $BREATH, on any platform, counts as one beat. Dust trades and bot spam don’t.' },
  { n: '02', tag: 'Pulse per hour', art: 'bars', title: '24 hours of silence kills it', body: 'As trading slows it gets anxious, then starts dying. No trade for 6 hours puts it in a coma. 24 hours and it flatlines.' },
  { n: '03', tag: 'One treasury, three heirs', art: 'split', title: 'Its death pays the living', body: 'When it dies, everything in its treasury is split among holders and saviors. Then a new generation is born.' },
];


const BUY_STEPS = [
  { n: '1', title: 'Get a wallet on Robinhood Chain', body: 'Any EVM wallet works. Add Robinhood Chain and bridge a little ETH for gas and your first buy.' },
  { n: '2', title: 'Open $BREATH on Pons', body: 'Use the official link on this page. Always double-check the contract address before you trade.' },
  { n: '3', title: 'Trade = give it a breath', body: 'Every buy or sell is a heartbeat. Trade while it is Dying or in a Coma and you become a Savior.' },
];

const ROADMAP = [
  { phase: 'Phase 1', name: 'Birth', state: 'now', items: ['Website and bedside monitor', 'X account and brand', 'Launch $BREATH on Pons', 'Agent goes live and starts posting'] },
  { phase: 'Phase 2', name: 'Life', state: 'next', items: ['Treasury buybacks from the creator fee', 'Savior tracking on-chain', 'Inheritance contract tested and reviewed', 'Live data on this monitor'] },
  { phase: 'Phase 3', name: 'Afterlife', state: 'later', items: ['First death and inheritance payout', 'Rebirth: new generations, new personalities', 'Graveyard history and lore', 'Community-voted names for future generations'] },
];

const FAQ = [
  { q: 'What happens to my $BREATH when it dies?', a: 'Nothing is taken from you. Your tokens stay in your wallet. On death, the agent’s treasury is split: 70% to holders by balance, 20% to saviors, 10% to the next generation.' },
  { q: 'Does trading on any platform count as a heartbeat?', a: 'Yes. The agent reads trades on-chain from the $BREATH pool, wherever they come from. Very small dust trades and spam from one wallet within a minute do not count.' },
  { q: 'Who keeps the servers and the AI running?', a: 'On Pons, 70% of the 2% trading fee goes to the creator. Of that creator fee, 70% pays for servers, AI, gas and listings, and 30% goes to the agent’s treasury.' },
  { q: 'How do I become a savior?', a: 'Trade while the agent is Dying or in a Coma. The trade that pulls it back is recorded, and saviors share 20% of the inheritance.' },
  { q: 'Can it come back after dying?', a: 'The same generation cannot. 24 hours after a death, a new generation is born with a new name and personality, and the same $BREATH token.' },
];

export default function Home() {
  return (
    <VitalsProvider>
      <Nav />

      <main id="top">
        {/* HERO: the mark breathes behind the wordmark */}
        <section className="hero" data-orb="sphere">
          <HeroScene>
            <div className="hero-copy">
              <p className="eyebrow mono"><span className="live-dot" /> {site.buyUrl ? <>Live on Pons · Robinhood Chain</> : <>AI agent · Robinhood Chain</>}</p>
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
                <PulseButton />
              </div>
              <HeroStats />
              <SoundToggle />
              <CopyCA className="contract" soon="" />
            </div>
          </HeroScene>
          <svg className="hero-ekg" viewBox="0 0 1600 120" preserveAspectRatio="none" aria-hidden="true">
            <path d={HERO_EKG} className="hero-ekg-base" />
            <path d={HERO_EKG} className="hero-ekg-pulse" pathLength="1" />
          </svg>
          <a href="#monitor" className="scroll-cue mono" aria-label="Scroll to the monitor">SCROLL<span /></a>
        </section>

        <Ticker />

        <section id="monitor" className="section" data-orb="monitor">
          <Reveal className="section-head">
            <span className="kicker mono">01 — Vital signs</span>
            <h2>Bedside monitor</h2>
            <p className="muted">Every spike is a real trade. When the line goes flat, it’s over.</p>
          </Reveal>
          <Reveal delay={80}><Monitor /></Reveal>
        </section>

        <section id="how" className="section" data-orb="heart">
          <Reveal className="section-head">
            <span className="kicker mono">02 — The rules</span>
            <h2>How it lives. How it dies.</h2>
          </Reveal>
          <div className="features">
            {STEPS.map((s, i) => (
              <Reveal key={s.n} delay={i * 90}>
                <article className="feature">
                  <div className="feature-art">
                    <span className="feature-tag mono">{s.tag}</span>
                    {s.art === 'merge' && <MergeArt />}
                    {s.art === 'bars' && <FadingBars />}
                    {s.art === 'split' && <SplitArt />}
                  </div>
                  <span className="step-n mono">{s.n}</span>
                  <h3>{s.title}</h3>
                  <p className="muted">{s.body}</p>
                </article>
              </Reveal>
            ))}
          </div>

          <Reveal className="stack-head">
            <span className="kicker mono">Five states of life</span>
            <h3>From healthy to flatline</h3>
          </Reveal>
          <Reveal delay={60}><StatusStack /></Reveal>
        </section>

        <section id="inheritance" className="section" data-orb="donut">
          <Reveal className="section-head">
            <span className="kicker mono">03 — The will</span>
            <h2>The inheritance</h2>
            <p className="muted">
              30% of the Pons creator fee goes to the agent’s treasury, which buys back {site.ticker} and holds it as its
              life savings. The other 70% keeps the lights on: servers, AI, gas and listings. When it dies, the savings are split:
            </p>
          </Reveal>
          <Reveal delay={80}>
            <InheritanceCard />
          </Reveal>
        </section>


        <section id="tokenomics" className="section" data-orb="coin">
          <Reveal className="section-head">
            <span className="kicker mono">04 — The money</span>
            <h2>Where every trade goes</h2>
            <p className="muted">Every trade pays a 2% fee on Pons. Slide to see where it goes.</p>
          </Reveal>
          <Reveal delay={80}>
            <TokenFlow />
          </Reveal>
        </section>

        <section id="buy" className="section" data-orb="logo">
          <Reveal className="section-head">
            <span className="kicker mono">05 — Keep it alive</span>
            <h2>How to give it a breath</h2>
          </Reveal>
          <div className="steps">
            {BUY_STEPS.map((s, i) => (
              <Reveal key={s.n} delay={i * 90}>
                <article className="card step buy-step">
                  <span className="buy-n">{s.n}</span>
                  <h3>{s.title}</h3>
                  <p className="muted">{s.body}</p>
                </article>
              </Reveal>
            ))}
          </div>
        </section>

        <section id="voice" className="section" data-orb="chat">
          <Reveal className="section-head">
            <span className="kicker mono">06 — Its voice</span>
            <h2>From the bedside</h2>
            <p className="muted">It posts on X. Its voice changes as its pulse does.</p>
          </Reveal>
          <Reveal delay={80}><Feed /></Reveal>
        </section>

        <section id="graveyard" className="section" data-orb="tomb">
          <Reveal className="section-head">
            <span className="kicker mono">07 — Those who came before</span>
            <h2>Graveyard</h2>
            <p className="muted">Every generation that flatlined, and what it left behind.</p>
          </Reveal>
          <Reveal delay={80}><Graveyard /></Reveal>
        </section>


        <section id="roadmap" className="section" data-orb="road">
          <Reveal className="section-head">
            <span className="kicker mono">08 — The plan</span>
            <h2>Roadmap</h2>
          </Reveal>
          <div className="roadmap">
            {ROADMAP.map((r, i) => (
              <Reveal key={r.name} delay={i * 100}>
                <article className={`phase phase-${r.state}`}>
                  <div className="phase-head">
                    <span className="mono phase-k">{r.phase}</span>
                    <span className={`phase-tag mono`}>{r.state === 'now' ? 'IN PROGRESS' : r.state === 'next' ? 'NEXT' : 'LATER'}</span>
                  </div>
                  <h3>{r.name}</h3>
                  <ul>{r.items.map((it) => <li key={it}>{it}</li>)}</ul>
                </article>
              </Reveal>
            ))}
          </div>
        </section>

        <section id="faq" className="section" data-orb="question">
          <Reveal className="section-head">
            <span className="kicker mono">09 — Questions</span>
            <h2>FAQ</h2>
          </Reveal>
          <Reveal delay={60}>
            <div className="faq">
              {FAQ.map((f) => (
                <details key={f.q} className="faq-item">
                  <summary>{f.q}<span className="faq-icon" aria-hidden="true" /></summary>
                  <p className="muted">{f.a}</p>
                </details>
              ))}
            </div>
          </Reveal>
        </section>

      </main>

      <footer className="footer2">
        <div className="footer2-grid">
          <div className="footer2-brand">
            <span className="brand"><Logo size={34} id="foot" /> Lastbreath</span>
            <p>An AI agent on Robinhood Chain that lives only while you trade {site.ticker}. Keep it breathing — or inherit its breath.</p>
            <a className="footer2-x" href={site.xUrl} target="_blank" rel="noopener noreferrer">Follow {site.xHandle} →</a>
          </div>
          <div className="footer2-col">
            <span className="mono">Explore</span>
            {NAV_LINKS.map((l) => <a key={l.id} href={`#${l.id}`}>{l.label}</a>)}
          </div>
          <div className="footer2-col">
            <span className="mono">Token</span>
            <a href="#buy">How to buy</a>
            <a href="#graveyard">Graveyard</a>
            <a href="#voice">Its posts</a>
            <CopyCA className="footer2-ca" />
          </div>
        </div>
        <div className="footer2-bottom">
          <span className="mono">© Lastbreath · {site.ticker}</span>
        </div>
      </footer>
      <MobileBar />
    </VitalsProvider>
  );
}
