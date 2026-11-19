// Shared agent logic, used by the always-on server (index.js) and the one-shot runner (once.js, GitHub Actions).
import fs from 'node:fs';
import path from 'node:path';
import { config as cfg } from './config.js';
import { initialState, tick, vitals } from './agent.js';
import { writePost } from './brain.js';
import { post } from './poster.js';
import { latestBlock, fetchTransfers, balanceOf, fetchTransfersRaw, willFreeBalance } from './chain.js';
import { balancesFromTransfers, writeWill } from './will.js';
import { personaFor } from './personas.js';

export const now = () => Math.floor(Date.now() / 1000);
// Pre-launch: no token yet. The agent is "unborn" and does not read the chain.
export const PRELAUNCH = !cfg.tokenAddress;
export const willDir = path.join(path.dirname(cfg.stateFile), 'wills');

export function load() {
  try { return JSON.parse(fs.readFileSync(cfg.stateFile, 'utf8')); }
  catch { return initialState(now()); }
}
export function save(state) {
  fs.mkdirSync(path.dirname(cfg.stateFile), { recursive: true });
  const tmp = cfg.stateFile + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(state, null, 2));
  fs.renameSync(tmp, cfg.stateFile); // atomic write
}

export function checkConfig() {
  if (PRELAUNCH) {
    console.warn('BREATH_TOKEN not set: PRE-LAUNCH mode. The agent is unborn and waits. Set BREATH_TOKEN + POOL_ADDRESSES to give birth.');
    return;
  }
  const missing = [];
  if (!cfg.rpcUrl) missing.push('RPC_URL');
  if (!cfg.poolAddresses.length) missing.push('POOL_ADDRESSES');
  if (missing.length) {
    console.error(`Missing env: ${missing.join(', ')}. See .env.example`);
    process.exit(1);
  }
  if (!cfg.willContract) console.warn('WILL_CONTRACT not set: treasury balance will show 0 and no will is written on death.');
  if (cfg.dryRun) console.warn('DRY_RUN=true: posts are printed, not published to X.');
}

export function prelaunchStatus() {
  return { generation: 1, name: personaFor(1).name, status: 'UNBORN', bpm: 0, treasury: 0, secondsToDeath: null, age: 0, saviors: 0, persona: personaFor(1), beats: [], inheritance: cfg.inheritance };
}

export function statusPayload(state, t = now()) {
  const v = vitals(state, t, cfg);
  const beats = state.beats.filter((b) => b.t >= t - cfg.windowSec).map((b) => ({ t: b.t, side: b.side }));
  return { ...v, persona: personaFor(v.generation), beats, inheritance: cfg.inheritance };
}

/** On death: snapshot holders at this block, split the treasury and save the will for settle(). */
async function prepareWill(state, ev, head) {
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

/** One heartbeat check: read new trades, update status, post what needs posting. Mutates and saves state. */
export async function step(state) {
  const t = now();
  const head = await latestBlock(cfg);
  const from = state.lastBlock === null ? (cfg.startBlock || head) : state.lastBlock + 1;
  const transfers = from <= head ? await fetchTransfers(cfg, from, head) : [];
  state.lastBlock = head;
  if (cfg.willContract) state.treasury = await balanceOf(cfg, cfg.willContract);

  const { events } = tick(state, transfers, t, cfg);
  for (const ev of events) {
    if (ev.kind === 'DEAD') await prepareWill(state, ev, head);
    const text = await writePost(ev.kind, ev.vitals, cfg);
    let result;
    try { result = await post(text, cfg); }
    catch (err) { console.error(`[X] ${err.message}`); result = { id: null, error: err.message, text }; }
    state.posts.unshift({ at: t, kind: ev.kind, generation: ev.vitals.generation, text, id: result.id });
    state.posts = state.posts.slice(0, 50);
  }
  save(state);
  const v = vitals(state, t, cfg);
  console.log(`[tick] gen ${v.generation} ${v.status} bpm=${v.bpm} death_in=${v.secondsToDeath}s block=${head} new_transfers=${transfers.length}`);
  return { head, events };
}
