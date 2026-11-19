// Read-only agent API for the website, backed by the `agent-state` branch that GitHub Actions updates.
// Same paths as the always-on agent server: /status /feed /graveyard /savior/:w /will/latest /will/:gen /will/:gen/:address
const RAW = process.env.AGENT_STATE_URL || 'https://raw.githubusercontent.com/lastbreathagent-prog/lastbreathagent/agent-state/public';

export const dynamic = 'force-dynamic';

async function file(name) {
  const res = await fetch(`${RAW}/${name}`, { next: { revalidate: 30 } });
  if (!res.ok) return undefined;
  return res.json();
}

const json = (body, status = 200) =>
  Response.json(body, { status, headers: { 'cache-control': 'public, s-maxage=20, stale-while-revalidate=60', 'access-control-allow-origin': '*' } });

export async function GET(_req, { params }) {
  const parts = (await params).path || [];
  const [a, b, c] = parts;
  try {
    if (a === 'status' && parts.length === 1) {
      const s = await file('status.json');
      if (!s) return json({ error: 'agent has not run yet' }, 503);
      // The file is written every few minutes: move the clocks forward to now.
      const drift = Math.max(0, Math.floor(Date.now() / 1000) - (s.updatedAt || 0));
      const out = { ...s, age: (s.age || 0) + (s.status === 'DEAD' || s.status === 'UNBORN' ? 0 : drift) };
      if (typeof s.secondsToDeath === 'number') out.secondsToDeath = Math.max(0, s.secondsToDeath - drift);
      return json(out);
    }
    if (a === 'feed' && !b) return json((await file('feed.json')) || []);
    if (a === 'graveyard' && !b) return json((await file('graveyard.json')) || []);
    if (a === 'savior' && /^0x[0-9a-fA-F]{40}$/.test(b || '')) {
      const saviors = (await file('saviors.json')) || {};
      return json({ wallet: b.toLowerCase(), rescues: saviors[b.toLowerCase()] ?? 0 });
    }
    if (a === 'will' && b === 'latest') return json((await file('wills/latest.json')) ?? null);
    if (a === 'will' && /^\d+$/.test(b || '')) {
      const will = await file(`wills/${b}.json`);
      if (!will) return json({ error: 'no will for this generation' }, 404);
      if (!c) return json(will);
      if (!/^0x[0-9a-fA-F]{40}$/.test(c)) return json({ error: 'bad address' }, 400);
      const heir = will.heirs.find((h) => h.account === c.toLowerCase());
      return json({ generation: will.generation, root: will.root, heir: heir || null });
    }
    return json({ error: 'not found' }, 404);
  } catch {
    return json({ error: 'agent state unavailable' }, 502);
  }
}
