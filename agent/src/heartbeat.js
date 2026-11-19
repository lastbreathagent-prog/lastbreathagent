// Turns raw $BREATH transfers into heartbeats.
// A heartbeat = one qualifying buy/sell against the pool, at most one per wallet per cooldown.

/**
 * @param {object} transfer {from, to, amount (number, whole tokens), timestamp (sec), txHash}
 * @param {object} cfg config
 * @returns {{wallet:string, side:'buy'|'sell'} | null}
 */
export function classifyTrade(transfer, cfg) {
  const from = transfer.from.toLowerCase();
  const to = transfer.to.toLowerCase();
  const pools = cfg.poolAddresses;
  let side = null;
  let wallet = null;
  if (pools.includes(from) && !pools.includes(to)) { side = 'buy'; wallet = to; }
  else if (pools.includes(to) && !pools.includes(from)) { side = 'sell'; wallet = from; }
  if (!side) return null; // plain wallet-to-wallet transfer, not a trade
  if (cfg.treasuryAddress && wallet === cfg.treasuryAddress) return null; // agent buybacks don't keep it alive
  if (transfer.amount < cfg.minTradeTokens) return null; // dust
  return { wallet, side };
}

/**
 * Applies new transfers to state and returns the beats that were added.
 * state.beats: [{t, wallet, side, txHash}], state.lastBeatByWallet: {wallet: t}
 */
export function ingestTransfers(state, transfers, cfg) {
  const added = [];
  const sorted = [...transfers].sort((a, b) => a.timestamp - b.timestamp);
  for (const tr of sorted) {
    const trade = classifyTrade(tr, cfg);
    if (!trade) continue;
    const last = state.lastBeatByWallet[trade.wallet];
    if (last !== undefined && tr.timestamp - last < cfg.walletCooldownSec) continue;
    state.lastBeatByWallet[trade.wallet] = tr.timestamp;
    const beat = { t: tr.timestamp, wallet: trade.wallet, side: trade.side, txHash: tr.txHash };
    state.beats.push(beat);
    added.push(beat);
  }
  return added;
}

/** Beats within the window ending at `now`. Also prunes old data to keep state small. */
export function beatsInWindow(state, now, cfg) {
  const since = now - cfg.windowSec;
  state.beats = state.beats.filter((b) => b.t >= since - cfg.windowSec); // keep 2h of history
  for (const [w, t] of Object.entries(state.lastBeatByWallet)) {
    if (now - t > cfg.walletCooldownSec * 10) delete state.lastBeatByWallet[w];
  }
  return state.beats.filter((b) => b.t >= since && b.t <= now).length;
}
