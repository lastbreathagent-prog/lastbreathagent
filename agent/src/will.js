// Writes the will of a generation that just died: who held, who saved it, and how much each gets.
// The result is a Merkle tree for LastbreathWill.settle() plus a public JSON anyone can check.
import fs from 'node:fs';
import path from 'node:path';
import { buildTree } from './merkle.js';

const ZERO = '0x0000000000000000000000000000000000000000';
const DEAD = '0x000000000000000000000000000000000000dead';

/** Replays Transfer logs into balances (token wei). */
export function balancesFromTransfers(transfers) {
  const bal = new Map();
  const add = (a, v) => bal.set(a, (bal.get(a) ?? 0n) + v);
  for (const t of transfers) {
    if (t.from !== ZERO) add(t.from, -t.value);
    if (t.to !== ZERO) add(t.to, t.value);
  }
  return bal;
}

/**
 * Split the free treasury: 70% to holders by balance, 20% to saviors by rescues.
 * The rest (10%, plus rounding dust, plus the savior pool if nobody saved it) stays
 * in the contract for the next generation.
 * @returns {{ payout: bigint, entries: {account, amount: bigint, holderShare: bigint, saviorShare: bigint}[] }}
 */
export function splitInheritance({ balances, saviors, freeBalance, exclude = [], split = { holders: 70, saviors: 20 } }) {
  const skip = new Set([ZERO, DEAD, ...exclude.map((a) => a.toLowerCase())]);
  const holders = [...balances].filter(([a, v]) => v > 0n && !skip.has(a));
  const totalHeld = holders.reduce((s, [, v]) => s + v, 0n);
  const holdersPool = (freeBalance * BigInt(split.holders)) / 100n;
  const saviorsPool = (freeBalance * BigInt(split.saviors)) / 100n;

  const out = new Map();
  const put = (a, key, v) => {
    if (v <= 0n) return;
    const e = out.get(a) ?? { account: a, amount: 0n, holderShare: 0n, saviorShare: 0n };
    e[key] += v;
    e.amount += v;
    out.set(a, e);
  };

  if (totalHeld > 0n) for (const [a, v] of holders) put(a, 'holderShare', (holdersPool * v) / totalHeld);

  const sv = Object.entries(saviors || {}).map(([a, n]) => [a.toLowerCase(), BigInt(n)]).filter(([a, n]) => n > 0n && !skip.has(a));
  const totalRescues = sv.reduce((s, [, n]) => s + n, 0n);
  if (totalRescues > 0n) for (const [a, n] of sv) put(a, 'saviorShare', (saviorsPool * n) / totalRescues);

  const entries = [...out.values()].filter((e) => e.amount > 0n).sort((a, b) => (b.amount > a.amount ? 1 : -1));
  const payout = entries.reduce((s, e) => s + e.amount, 0n);
  return { payout, entries };
}

/** Builds and saves the will file. Returns the summary to settle on-chain. */
export function writeWill({ dir, generation, name, block, freeBalance, balances, saviors, exclude }) {
  const { payout, entries } = splitInheritance({ balances, saviors, freeBalance, exclude });
  if (!entries.length) return null;
  const tree = buildTree(entries.map((e) => ({ account: e.account, amount: e.amount })));
  const will = {
    generation,
    name,
    snapshotBlock: block,
    freeBalance: freeBalance.toString(),
    payout: payout.toString(),
    root: tree.root,
    heirs: entries.map((e) => ({
      account: e.account,
      amount: e.amount.toString(),
      holderShare: e.holderShare.toString(),
      saviorShare: e.saviorShare.toString(),
      proof: tree.proofs[e.account].proof,
    })),
  };
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, `will-gen-${generation}.json`), JSON.stringify(will, null, 2));
  return will;
}

export function readWill(dir, generation) {
  try { return JSON.parse(fs.readFileSync(path.join(dir, `will-gen-${generation}.json`), 'utf8')); }
  catch { return null; }
}
