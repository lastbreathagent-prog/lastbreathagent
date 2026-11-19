// Live runner: poll Robinhood Chain -> update heartbeat/status -> post to X -> serve /status for the website.
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { config as cfg } from './config.js';
import { initialState, tick, vitals } from './agent.js';
import { writePost } from './brain.js';
import { post } from './poster.js';
import { latestBlock, fetchTransfers, balanceOf, fetchTransfersRaw, willFreeBalance } from './chain.js';
import { balancesFromTransfers, writeWill, readWill } from './will.js';
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

const willDir = path.join(path.dirname(cfg.stateFile), 'wills');

/** On death: snapshot holders at this block, split the treasury and save the will for settle(). */
async function prepareWill(ev, head) {
  if (!cfg.willContract) { console.warn('[will] WILL_CONTRACT not set, skipping will'); return; }
  try {
    const transfers = await fetchTransfersRaw(cfg, cfg.startBlock, head);
    const balances = balancesFromTransfers(transfers);
    const freeBalance = await willFreeBalance(cfg);
    const dead = state.graveyard.at(-1);
    const will = writeWill({
      dir: willDir,
      generation: ev.vitals.generation,
      name: ev.vitals.name,
      block: head,
      freeBalance,
      balances,
      saviors: dead?.saviors || {},
      exclude: [...cfg.poolAddresses, cfg.willContract, cfg.treasuryAddress, cfg.agentWallet].filter(Boolean),
    });
    if (!will) { console.warn('[will] nobody to inherit'); return; }
    state.wills = [...(state.wills || []), { generation: will.generation, root: will.root, payout: will.payout, heirs: will.heirs.length, block: head }];
    const uri = cfg.publicUrl ? `${cfg.publicUrl.replace(/\/$/, '')}/will/${will.generation}` : '';
    console.log(`[will] Gen ${will.generation}: ${will.heirs.length} heirs, payout ${will.payout} wei. Call settle():`);
    console.log(`        settle(${will.root}, ${will.payout}, "${uri}")`);
  } catch (err) {
    console.error(`[will] failed: ${err.message}`);
  }
}


async function step() {
  const t = now();
  const head = await latestBlock(cfg);
  const from = state.lastBlock === null ? (cfg.startBlock || head) : state.lastBlock + 1;
  const transfers = from <= head ? await fetchTransfers(cfg, from, head) : [];
  state.lastBlock = head;
  if (cfg.willContract) state.treasury = await balanceOf(cfg, cfg.willContract);

  const { events } = tick(state, transfers, t, cfg);
  for (const ev of events) {
    if (ev.kind === 'DEAD') await prepareWill(ev, head);
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
    if (req.url === '/will/latest') return res.end(JSON.stringify((state.wills || []).at(-1) || null));
    const wm = req.url?.match(/^\/will\/(\d+)(?:\/(0x[0-9a-fA-F]{40}))?$/);
    if (wm) {
      const will = readWill(willDir, Number(wm[1]));
      if (!will) { res.statusCode = 404; return res.end(JSON.stringify({ error: 'no will for this generation' })); }
      if (!wm[2]) return res.end(JSON.stringify(will));
      const heir = will.heirs.find((h) => h.account === wm[2].toLowerCase());
      return res.end(JSON.stringify({ generation: will.generation, root: will.root, heir: heir || null }));
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
