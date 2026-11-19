// Live runner: poll Robinhood Chain -> update heartbeat/status -> post to X -> serve /status for the website.
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { config as cfg } from './config.js';
import { initialState, tick, vitals } from './agent.js';
import { writePost } from './brain.js';
import { post } from './poster.js';
import { latestBlock, fetchTransfers, balanceOf } from './chain.js';
import { personaFor } from './personas.js';

const now = () => Math.floor(Date.now() / 1000);

function load() {
  try { return JSON.parse(fs.readFileSync(cfg.stateFile, 'utf8')); }
  catch { return initialState(now()); }
}
function save(state) {
  fs.mkdirSync(path.dirname(cfg.stateFile), { recursive: true });
  const tmp = cfg.stateFile + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(state, null, 2));
  fs.renameSync(tmp, cfg.stateFile); // atomic write
}

function checkConfig() {
  const missing = [];
  if (!cfg.rpcUrl) missing.push('RPC_URL');
  if (!cfg.tokenAddress) missing.push('BREATH_TOKEN');
  if (!cfg.poolAddresses.length) missing.push('POOL_ADDRESSES');
  if (missing.length) {
    console.error(`Missing env: ${missing.join(', ')}. See .env.example`);
    process.exit(1);
  }
  if (!cfg.treasuryAddress) console.warn('TREASURY_ADDRESS not set: treasury balance will show 0 and buybacks could count as beats.');
  if (cfg.dryRun) console.warn('DRY_RUN=true: posts are printed, not published to X.');
}

let state = load();

async function step() {
  const t = now();
  const head = await latestBlock(cfg);
  const from = state.lastBlock === null ? (cfg.startBlock || head) : state.lastBlock + 1;
  const transfers = from <= head ? await fetchTransfers(cfg, from, head) : [];
  state.lastBlock = head;
  if (cfg.treasuryAddress) state.treasury = await balanceOf(cfg, cfg.treasuryAddress);

  const { events } = tick(state, transfers, t, cfg);
  for (const ev of events) {
    const text = await writePost(ev.kind, ev.vitals, cfg);
    let result;
    try { result = await post(text, cfg); }
    catch (err) { console.error(`[X] ${err.message}`); result = { id: null, error: err.message, text }; }
    state.posts.unshift({ at: t, kind: ev.kind, generation: ev.vitals.generation, text, id: result.id });
    state.posts = state.posts.slice(0, 50);
  }
  save(state);
  const v = vitals(state, t, cfg);
  console.log(`[tick] gen ${v.generation} ${v.status} bpm=${v.bpm} death_in=${v.secondsToDeath}s block=${head}`);
}

// --- Public API for the website (read-only) ---
function startApi() {
  http.createServer((req, res) => {
    res.setHeader('access-control-allow-origin', '*');
    res.setHeader('content-type', 'application/json');
    const t = now();
    if (req.url === '/status') {
      const v = vitals(state, t, cfg);
      const beats = state.beats.filter((b) => b.t >= t - cfg.windowSec).map((b) => ({ t: b.t, side: b.side }));
      return res.end(JSON.stringify({ ...v, persona: personaFor(v.generation), beats, inheritance: cfg.inheritance }));
    }
    if (req.url === '/feed') return res.end(JSON.stringify(state.posts));
    if (req.url === '/graveyard') return res.end(JSON.stringify(state.graveyard));
    if (req.url?.startsWith('/savior/')) {
      const w = req.url.split('/')[2]?.toLowerCase();
      return res.end(JSON.stringify({ wallet: w, rescues: state.current.saviors[w] ?? 0 }));
    }
    res.statusCode = 404;
    res.end(JSON.stringify({ error: 'not found' }));
  }).listen(cfg.apiPort, () => console.log(`[api] http://localhost:${cfg.apiPort}/status`));
}

checkConfig();
startApi();
let running = false;
const loop = async () => {
  if (running) return;
  running = true;
  try { await step(); } catch (err) { console.error(`[tick] ${err.message}`); }
  finally { running = false; }
};
loop();
setInterval(loop, cfg.pollSeconds * 1000);
