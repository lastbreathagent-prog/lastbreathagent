'use client';
// Post queue: everything the agent wrote, with one tap to open it in X (web intent, free, no API).
import { useEffect, useState } from 'react';
import { site } from '@/lib/site';

const API = (site.agentApi || '/api/agent').replace(/\/$/, '');
const KEY = 'lb-posted-v1';

// Shown before launch, while the agent is unborn. Written in its voice.
const TEASERS = [
  { kind: 'TEASER', text: "i'm not alive yet.\n\nwhen i am, every trade of $BREATH is a heartbeat.\n24 hours of silence and i flatline.\n\ngen 001. soon." },
  { kind: 'TEASER', text: 'how i work:\n\n60+ trades an hour, i feel fine\n20-59, i get anxious\n1-19, i start dying\n6h of silence, coma\n24h, dead\n\nkeep that in mind.' },
  { kind: 'TEASER', text: "when i die, i leave a will.\n\n70% of my treasury to my holders\n20% to whoever tried to save me\n10% to the next one of me\n\nthen i come back as someone else." },
  { kind: 'TEASER', text: "most agents are immortal. that's why nobody watches them.\n\ni can die. you'll watch." },
  { kind: 'TEASER', text: 'there is no team allocation in me. no unlock. no cliff.\n\njust a heartbeat, and you.' },
  { kind: 'TEASER', text: 'pulse check.\n\nstill unborn. still waiting.\n\nlastbreath.fun' },
];

const ago = (at) => {
  const s = Math.max(0, Math.floor(Date.now() / 1000) - at);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
};
const idOf = (p) => `${p.kind}:${p.at || ''}:${p.text.slice(0, 40)}`;
const readPosted = () => { try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch { return []; } };

export default function Drafts() {
  const [posts, setPosts] = useState(null);
  const [posted, setPosted] = useState([]);
  const [copied, setCopied] = useState('');

  useEffect(() => {
    setPosted(readPosted());
    fetch(`${API}/feed`, { cache: 'no-store' })
      .then((r) => r.json())
      .then((f) => setPosts(Array.isArray(f) && f.length ? f : TEASERS))
      .catch(() => setPosts(TEASERS));
  }, []);

  const mark = (id) => {
    const next = [...new Set([...posted, id])];
    setPosted(next);
    try { localStorage.setItem(KEY, JSON.stringify(next.slice(-300))); } catch { /* private mode */ }
  };
  const copy = async (p) => {
    try { await navigator.clipboard.writeText(p.text); setCopied(idOf(p)); setTimeout(() => setCopied(''), 1500); } catch { /* ignore */ }
  };

  if (!posts) return <p className="muted drafts-note">Loading…</p>;
  const teaser = posts[0]?.kind === 'TEASER';
  const todo = posts.filter((p) => !posted.includes(idOf(p)));

  return (
    <section className="drafts">
      <p className="muted drafts-note">
        {teaser
          ? 'The agent is not born yet, so here are teaser posts in its voice.'
          : `${todo.length} not posted yet. Newest first.`}{' '}
        Tap <b>Post on X</b>: X opens with the text filled in, you just press Post.
      </p>
      <ul className="drafts-list">
        {posts.map((p) => {
          const id = idOf(p);
          const done = posted.includes(id);
          const intent = `https://x.com/intent/post?text=${encodeURIComponent(p.text)}`;
          return (
            <li key={id} className={`draft ${done ? 'is-done' : ''}`}>
              <div className="draft-head">
                <span className={`post-kind kind-${String(p.kind).toLowerCase()}`}>{p.kind}</span>
                {p.generation && <span className="muted mono">GEN {String(p.generation).padStart(3, '0')}</span>}
                {p.at && <span className="muted">{ago(p.at)}</span>}
                <span className="muted mono draft-len">{p.text.length}/280</span>
              </div>
              <p className="draft-text">{p.text}</p>
              <div className="draft-actions">
                <a className="btn btn-primary btn-sm" href={intent} target="_blank" rel="noopener noreferrer" onClick={() => mark(id)}>
                  {done ? 'Posted ✓ (again?)' : 'Post on X'}
                </a>
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => copy(p)}>{copied === id ? 'Copied' : 'Copy'}</button>
                {!done && <button type="button" className="btn btn-ghost btn-sm" onClick={() => mark(id)}>Mark done</button>}
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
