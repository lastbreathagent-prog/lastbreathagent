// Minimal JSON-RPC reader for $BREATH Transfer events and token balances. No dependencies.
const TRANSFER_TOPIC = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';

let rpcId = 0;
async function rpc(cfg, method, params) {
  const res = await fetch(cfg.rpcUrl, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: ++rpcId, method, params }),
  });
  const data = await res.json();
  if (data.error) throw new Error(`RPC ${method}: ${data.error.message}`);
  return data.result;
}

const hex = (n) => '0x' + n.toString(16);
const topicToAddress = (t) => '0x' + t.slice(26).toLowerCase();

/** Converts a raw uint256 amount to whole tokens (float, fine for thresholds and display). */
export const toTokens = (raw, decimals) => (!raw || raw === '0x') ? 0 : Number(BigInt(raw) / 10n ** BigInt(Math.max(decimals - 6, 0))) / 10 ** Math.min(decimals, 6);

export const latestBlock = async (cfg) => Number(await rpc(cfg, 'eth_blockNumber', []));

const blockTimeCache = new Map();
async function blockTime(cfg, blockHex) {
  if (!blockTimeCache.has(blockHex)) {
    const b = await rpc(cfg, 'eth_getBlockByNumber', [blockHex, false]);
    blockTimeCache.set(blockHex, Number(b.timestamp));
    if (blockTimeCache.size > 5000) blockTimeCache.delete(blockTimeCache.keys().next().value);
  }
  return blockTimeCache.get(blockHex);
}

/** Fetches $BREATH transfers in [fromBlock, toBlock], chunked to stay under RPC limits. */
export async function fetchTransfers(cfg, fromBlock, toBlock) {
  const out = [];
  for (let start = fromBlock; start <= toBlock; start += cfg.maxBlockRange) {
    const end = Math.min(start + cfg.maxBlockRange - 1, toBlock);
    const logs = await rpc(cfg, 'eth_getLogs', [{
      address: cfg.tokenAddress,
      fromBlock: hex(start),
      toBlock: hex(end),
      topics: [TRANSFER_TOPIC],
    }]);
    for (const l of logs) {
      out.push({
        from: topicToAddress(l.topics[1]),
        to: topicToAddress(l.topics[2]),
        amount: toTokens(l.data, cfg.tokenDecimals),
        timestamp: await blockTime(cfg, l.blockNumber),
        txHash: l.transactionHash,
      });
    }
  }
  return out;
}

/** $BREATH balance of an address (used to show the treasury). */
export async function balanceOf(cfg, address) {
  const data = '0x70a08231' + address.toLowerCase().replace('0x', '').padStart(64, '0');
  const raw = await rpc(cfg, 'eth_call', [{ to: cfg.tokenAddress, data }, 'latest']);
  return toTokens(raw, cfg.tokenDecimals);
}
