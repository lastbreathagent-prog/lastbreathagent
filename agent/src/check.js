// Checks the API keys without posting anything. Run: npm run check
// Add --post to publish ONE real test tweet (only if DRY_RUN=false).
import { config as cfg } from './config.js';
import { oauthHeader, post } from './poster.js';
import { writePost } from './brain.js';
import { personaFor } from './personas.js';

const ok = (m) => console.log(`✅ ${m}`);
const bad = (m) => console.log(`❌ ${m}`);
const info = (m) => console.log(`ℹ️  ${m}`);

async function checkX() {
  const { apiKey, apiSecret, accessToken, accessSecret } = cfg.x;
  if (!apiKey || !apiSecret || !accessToken || !accessSecret) return bad('X keys missing (X_API_KEY, X_API_SECRET, X_ACCESS_TOKEN, X_ACCESS_SECRET)');
  const url = 'https://api.x.com/2/users/me';
  const res = await fetch(url, { headers: { authorization: oauthHeader('GET', url, cfg.x) } });
  const body = await res.text();
  if (res.ok) {
    const u = JSON.parse(body).data;
    return ok(`X connected as @${u.username}`), true;
  }
  if (res.status === 401) bad(`X 401: keys are wrong or the Access Token was made before you set "Read and write". Regenerate the Access Token. ${body}`);
  else if (res.status === 403) bad(`X 403: app has no access to this endpoint (check the app is inside a Project and has Read and write). ${body}`);
  else if (res.status === 429) info('X 429: rate limited, but the keys were accepted.');
  else bad(`X ${res.status}: ${body}`);
}

async function checkClaude() {
  if (!cfg.anthropicKey) return info('ANTHROPIC_API_KEY not set: the agent will use its built-in templates (works fine, less variety).');
  const sample = await writePost('HEALTHY', { generation: 1, name: personaFor(1).name, status: 'HEALTHY', bpm: 72, treasury: 0, secondsToDeath: 86400, age: 3600, saviors: 0 }, cfg, { warn: (m) => bad(m) });
  ok(`Claude (${cfg.model}) sample post:\n   "${sample}"`);
}

console.log(`\nLastbreath agent check   mode: ${cfg.tokenAddress ? 'LIVE' : 'PRE-LAUNCH'}   DRY_RUN: ${cfg.dryRun}\n`);
await checkClaude().catch((e) => bad(`Claude: ${e.message}`));
const xOk = await checkX().catch((e) => bad(`X: ${e.message}`));

if (process.argv.includes('--post')) {
  if (cfg.dryRun) info('--post ignored: set DRY_RUN=false to publish the test tweet.');
  else if (xOk) {
    const r = await post('🫁 test breath. ignore me.', cfg);
    ok(`test tweet posted: https://x.com/i/web/status/${r.id} (you can delete it)`);
  }
}
console.log('');
