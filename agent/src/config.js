// Lastbreath agent configuration. Every value can be overridden with an env var.
const env = (key, fallback) => process.env[key] ?? fallback;
const num = (key, fallback) => Number(env(key, fallback));
const list = (key) => (env(key, '') || '').split(',').map((s) => s.trim().toLowerCase()).filter(Boolean);

export const config = {
  // --- Chain (Robinhood Chain, chain id 4663) ---
  rpcUrl: env('RPC_URL', ''),
  tokenAddress: env('BREATH_TOKEN', '').toLowerCase(),
  // Pons bonding curve + post-graduation pool. A Transfer from/to these = a trade.
  poolAddresses: list('POOL_ADDRESSES'),
  // Treasury wallet/contract. Its own buybacks never count as a heartbeat.
  treasuryAddress: env('TREASURY_ADDRESS', '').toLowerCase(),
  tokenDecimals: num('TOKEN_DECIMALS', 18),
  startBlock: num('START_BLOCK', 0),
  pollSeconds: num('POLL_SECONDS', 60),
  maxBlockRange: num('MAX_BLOCK_RANGE', 2000),

  // --- Heartbeat rules ---
  minTradeTokens: num('MIN_TRADE_TOKENS', 10000), // dust trades below this don't count
  walletCooldownSec: num('WALLET_COOLDOWN_SEC', 60), // 1 beat per wallet per 60s
  windowSec: 3600, // BPM window: last 1 hour

  // --- Status thresholds (beats in the last hour) ---
  thresholds: {
    healthy: num('HEALTHY_MIN', 60), // >= 60  -> HEALTHY
    anxious: num('ANXIOUS_MIN', 20), // 20-59  -> ANXIOUS
    // 1-19 -> DYING
  },
  comaAfterSec: num('COMA_AFTER_SEC', 6 * 3600), // 0 beats for 6h  -> COMA
  deathAfterSec: num('DEATH_AFTER_SEC', 24 * 3600), // 0 beats for 24h -> DEAD
  rebirthAfterSec: num('REBIRTH_AFTER_SEC', 24 * 3600), // new generation 24h after death

  // --- Posting cadence per status (seconds between posts) ---
  postEverySec: {
    HEALTHY: 8 * 3600,
    ANXIOUS: 2 * 3600,
    DYING: 30 * 60,
    COMA: 3600,
  },

  // --- Inheritance split (executed by the contract; the agent only announces it) ---
  inheritance: { holders: 70, saviors: 20, nextGeneration: 10 },

  // --- LLM (Anthropic) ---
  anthropicKey: env('ANTHROPIC_API_KEY', ''),
  model: env('LLM_MODEL', 'claude-sonnet-4-5'),

  // --- X (Twitter) API v2, OAuth 1.0a user context ---
  x: {
    apiKey: env('X_API_KEY', ''),
    apiSecret: env('X_API_SECRET', ''),
    accessToken: env('X_ACCESS_TOKEN', ''),
    accessSecret: env('X_ACCESS_SECRET', ''),
  },
  dryRun: env('DRY_RUN', 'true') !== 'false', // default: print posts, don't publish

  // --- Storage + API ---
  stateFile: env('STATE_FILE', './data/state.json'),
  apiPort: num('API_PORT', 8787),
};
