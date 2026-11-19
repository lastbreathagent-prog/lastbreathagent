// One-shot runner for GitHub Actions (free, no server): load state, check the chain once, post, save,
// and write public JSON files that the website reads through /api/agent.
//   STATE_FILE=state/state.json node src/once.js
import fs from 'node:fs';
import path from 'node:path';
import { config as cfg } from './config.js';
import { now, PRELAUNCH, willDir, load, save, checkConfig, prelaunchStatus, statusPayload, step } from './core.js';

const outDir = path.join(path.dirname(cfg.stateFile), 'public');
const write = (name, data) => {
  fs.mkdirSync(path.dirname(path.join(outDir, name)), { recursive: true });
  fs.writeFileSync(path.join(outDir, name), JSON.stringify(data));
};

checkConfig();
const t = now();
if (PRELAUNCH) {
  write('status.json', { ...prelaunchStatus(), updatedAt: t });
  write('feed.json', []);
  write('graveyard.json', []);
  write('saviors.json', {});
  write('wills/latest.json', null);
  console.log('[once] pre-launch: wrote UNBORN status');
} else {
  const state = load();
  try {
    await step(state);
  } catch (err) {
    console.error(`[once] tick failed: ${err.message}`); // keep last good state, still refresh the public files
    save(state);
  }
  write('status.json', { ...statusPayload(state, now()), updatedAt: now() });
  write('feed.json', state.posts);
  write('graveyard.json', state.graveyard);
  write('saviors.json', state.current.saviors || {});
  write('wills/latest.json', (state.wills || []).at(-1) || null);
  // Copy full wills so heirs can fetch their proof.
  if (fs.existsSync(willDir)) {
    for (const f of fs.readdirSync(willDir)) {
      const m = f.match(/^will-gen-(\d+)\.json$/);
      if (m) fs.copyFileSync(path.join(willDir, f), path.join(outDir, 'wills', `${m[1]}.json`));
    }
  }
  console.log('[once] public files updated');
}
