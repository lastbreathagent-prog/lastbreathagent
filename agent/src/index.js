// Always-on runner (VPS / Railway / Render): poll the chain every POLL_SECONDS and serve a read-only API for the website.
// For a free setup without a server, see once.js + .github/workflows/agent.yml (GitHub Actions).
import http from 'node:http';
import { config as cfg } from './config.js';
import { initialState } from './agent.js';
import { readWill } from './will.js';
import { now, PRELAUNCH, willDir, load, checkConfig, prelaunchStatus, statusPayload, step } from './core.js';

checkConfig();
const state = PRELAUNCH ? initialState(now()) : load();

http.createServer((req, res) => {
  res.setHeader('access-control-allow-origin', '*');
  res.setHeader('content-type', 'application/json');
  const send = (body, code = 200) => { res.statusCode = code; res.end(JSON.stringify(body)); };
  const url = req.url || '';
  if (url === '/' || url === '/health') return send({ ok: true, mode: PRELAUNCH ? 'prelaunch' : 'live' });
  if (url === '/status') return send(PRELAUNCH ? prelaunchStatus() : statusPayload(state));
  if (url === '/will/latest') return send((state.wills || []).at(-1) || null);
  const wm = url.match(/^\/will\/(\d+)(?:\/(0x[0-9a-fA-F]{40}))?$/);
  if (wm) {
    const will = readWill(willDir, Number(wm[1]));
    if (!will) return send({ error: 'no will for this generation' }, 404);
    if (!wm[2]) return send(will);
    const heir = will.heirs.find((h) => h.account === wm[2].toLowerCase());
    return send({ generation: will.generation, root: will.root, heir: heir || null });
  }
  if (url === '/feed') return send(state.posts);
  if (url === '/graveyard') return send(state.graveyard);
  if (url.startsWith('/savior/')) {
    const w = url.split('/')[2]?.toLowerCase();
    return send({ wallet: w, rescues: state.current.saviors[w] ?? 0 });
  }
  send({ error: 'not found' }, 404);
}).listen(cfg.apiPort, () => console.log(`[api] http://localhost:${cfg.apiPort}/status`));

if (!PRELAUNCH) {
  let running = false;
  const loop = async () => {
    if (running) return;
    running = true;
    try { await step(state); } catch (err) { console.error(`[tick] ${err.message}`); }
    finally { running = false; }
  };
  loop();
  setInterval(loop, cfg.pollSeconds * 1000);
}
