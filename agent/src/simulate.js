// Offline simulation of one full life: healthy -> anxious -> dying -> saved -> coma -> dead -> reborn.
// No chain, no X, no LLM needed. Run: npm run simulate
import { config as base } from './config.js';
import { initialState, tick, vitals } from './agent.js';
import { writePost, fmtDuration } from './brain.js';
import { ingestTransfers } from './heartbeat.js';

const POOL = '0x' + 'aa'.repeat(20);
const TREASURY = '0x000000000000000000000000000000000000beef';
const cfg = { ...base, poolAddresses: [POOL], treasuryAddress: TREASURY, anthropicKey: '', dryRun: true };
const quiet = { warn: () => {}, info: () => {} };

const T0 = 1_800_000_000;
const MIN = 60;
const HOUR = 3600;
let n = 0;
const wallet = (i) => '0x' + i.toString(16).padStart(40, '0');

// Generate `count` buys spread evenly over [start, start+span), each from a different wallet.
function trades(start, span, count, opts = {}) {
  return Array.from({ length: count }, (_, i) => ({
    from: opts.sell ? wallet(1000 + n + i) : POOL,
    to: opts.sell ? POOL : (opts.to ?? wallet(1000 + n + i)),
    amount: opts.amount ?? 50_000,
    timestamp: start + Math.floor((i * span) / count),
    txHash: `0xtx${++n}`,
  }));
}

const state = initialState(T0);
state.treasury = 12_500_000;
const results = [];

async function run(label, from, to, stepSec, makeTransfers) {
  for (let t = from; t <= to; t += stepSec) {
    const transfers = makeTransfers ? makeTransfers(t, stepSec) : [];
    const { events } = tick(state, transfers, t, cfg);
    for (const ev of events) {
      const text = await writePost(ev.kind, ev.vitals, cfg, quiet);
      results.push({ label, at: t - T0, kind: ev.kind, gen: ev.vitals.generation, bpm: ev.vitals.bpm, text });
      // Live, the contract pays out the inheritance and the agent re-reads its balance from chain.
      // Here we mimic it: 90% leaves the treasury, the next generation keeps 10%.
      if (ev.kind === 'DEAD') state.treasury *= cfg.inheritance.nextGeneration / 100;
    }
  }
}

// Phase 1 (0-3h): busy market, ~90 trades/hour -> HEALTHY
await run('busy', T0, T0 + 3 * HOUR, 5 * MIN, (t, s) => trades(t, s, 8));
// Phase 1b: dust trades and treasury buybacks must NOT count
await run('noise', T0 + 3 * HOUR + MIN, T0 + 3 * HOUR + MIN, MIN, (t) => [
  ...trades(t, 30, 50, { amount: 5 }), // dust
  ...trades(t, 30, 50, { to: TREASURY }), // agent's own buybacks
]);
// Phase 2 (3-5h): slowing down, ~30/hour -> ANXIOUS
await run('slowing', T0 + 3 * HOUR + 5 * MIN, T0 + 5 * HOUR, 5 * MIN, (t, s) => trades(t, s, 3));
// Phase 3 (5-7h): ~6/hour -> DYING
await run('dying', T0 + 5 * HOUR + 5 * MIN, T0 + 7 * HOUR, 10 * MIN, (t, s) => trades(t, s, 1));
// Phase 4 (7-9h): one whale + crowd rescue -> back to ANXIOUS/HEALTHY, savior recorded
await run('rescue', T0 + 7 * HOUR + 5 * MIN, T0 + 9 * HOUR, 5 * MIN, (t, s) => trades(t, s, 6));
// Phase 5: total silence for 25h -> DYING -> COMA -> DEAD
await run('silence', T0 + 9 * HOUR + 5 * MIN, T0 + 34 * HOUR, 30 * MIN);
// Phase 6: 24h after death -> REBIRTH as Gen 2
await run('afterlife', T0 + 34 * HOUR + 30 * MIN, T0 + 60 * HOUR, HOUR);

// ---- Report ----
const pad = (s, w) => String(s).padEnd(w);
console.log('time      gen kind     bpm  post');
for (const r of results) console.log(`${pad(fmtDuration(r.at), 9)} ${pad(r.gen, 3)} ${pad(r.kind, 8)} ${pad(r.bpm, 4)} ${r.text}`);

const v = vitals(state, T0 + 60 * HOUR, cfg);
const dead = state.graveyard[0];
console.log('\n--- checks ---');
const checks = [
  ['newborn is not dying in its first hour', !results.some((r) => r.at < HOUR && (r.kind === 'DYING' || r.kind === 'SAVED'))],
  ['first post is a birth announcement', results[0]?.kind === 'BIRTH'],
  ['dust + treasury buybacks ignored', (() => {
    const s = initialState(T0);
    const noise = [...trades(T0, 30, 50, { amount: 5 }), ...trades(T0, 30, 50, { to: TREASURY })];
    return ingestTransfers(s, noise, cfg).length === 0 && ingestTransfers(s, trades(T0, 30, 3), cfg).length === 3;
  })()],
  ['same wallet counts once per minute', (() => {
    const s = initialState(T0);
    const spam = Array.from({ length: 10 }, (_, i) => ({ from: POOL, to: wallet(7), amount: 50_000, timestamp: T0 + i * 5, txHash: `0xs${i}` }));
    return ingestTransfers(s, spam, cfg).length === 1;
  })()],
  ['reached HEALTHY', results.some((r) => r.kind === 'HEALTHY')],
  ['reached ANXIOUS', results.some((r) => r.kind === 'ANXIOUS')],
  ['reached DYING', results.some((r) => r.kind === 'DYING')],
  ['savior recorded on rescue', results.some((r) => r.kind === 'SAVED')],
  ['reached COMA', results.some((r) => r.kind === 'COMA')],
  ['died once', state.graveyard.length === 1 && results.filter((r) => r.kind === 'DEAD').length === 1],
  ['died ~24h after last beat', dead && Math.abs(dead.diedAt - (T0 + 9 * HOUR) - 24 * HOUR) <= 30 * MIN],
  ['reborn as Gen 2', v.generation === 2 && results.some((r) => r.kind === 'REBIRTH')],
  ['no posts while dead', !results.some((r) => r.gen === 1 && r.at > dead.diedAt - T0 && r.kind !== 'DEAD')],
];
let ok = true;
for (const [name, pass] of checks) { console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}`); ok &&= !!pass; }
console.log(`\nGen 1 lifespan: ${fmtDuration(dead.lifespanSec)}, saviors: ${Object.keys(dead.saviors).length}`);
process.exit(ok ? 0 : 1);
