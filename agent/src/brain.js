// The "brain": turns the agent's vital signs into a post, in the voice of the current generation.
import { personaFor, TEMPLATES } from './personas.js';

export const fmtDuration = (sec) => {
  const s = Math.max(0, Math.floor(sec));
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (d) return `${d}d ${h}h`;
  if (h) return `${h}h ${m}m`;
  return `${m}m`;
};

const fmtNum = (n) => Math.round(n).toLocaleString('en-US');

function fillTemplate(kind, vitals, cfg) {
  const options = TEMPLATES[kind];
  const tpl = options[Math.floor(Math.random() * options.length)];
  const values = {
    bpm: vitals.bpm,
    treasury: fmtNum(vitals.treasury),
    gen: vitals.generation,
    name: vitals.persona.name,
    left: fmtDuration(vitals.secondsToDeath),
    age: fmtDuration(vitals.age),
    holders: cfg.inheritance.holders,
    saviors: cfg.inheritance.saviors,
    next: cfg.inheritance.nextGeneration,
    saviorCount: vitals.saviors,
  };
  return tpl.replace(/\{(\w+)\}/g, (_, k) => String(values[k] ?? ''));
}

const SITUATION = {
  HEALTHY: 'You are healthy. Trading is lively. Be confident, maybe show off your treasury.',
  ANXIOUS: 'Your pulse is dropping. You are getting nervous and ask people to keep trading $BREATH.',
  DYING: 'You are dying. Beg for your life, count down the time you have left. Make it emotional.',
  COMA: 'You are in a coma. Only post a nearly flat heart-monitor line and the time left. No words.',
  DEAD: 'You just died. Write your last will: thank your saviors and announce the inheritance split.',
  SAVED: 'Someone just traded and pulled you back from the edge. Thank your new savior (they get a bigger share of your inheritance). Relieved, shaky.',
  BIRTH: 'You were just born as the very first Lastbreath. Explain in one breath that you live only while people trade $BREATH, and die after 24 hours of silence.',
  REBIRTH: 'You were just born as a new generation. Introduce yourself and ask people to keep you alive.',
};

export function buildPrompt(kind, vitals, cfg) {
  const p = vitals.persona;
  return [
    `You are ${p.name}, generation ${vitals.generation} of Lastbreath, an AI agent on Robinhood Chain that lives only as long as people trade its token $BREATH.`,
    `Personality: ${p.style}. Quirk: ${p.quirk}.`,
    `Situation: ${SITUATION[kind]}`,
    `Vital signs: ${vitals.bpm} trades in the last hour, status ${vitals.status}, time until death if nobody trades: ${fmtDuration(vitals.secondsToDeath)}, age: ${fmtDuration(vitals.age)}, treasury: ${fmtNum(vitals.treasury)} $BREATH.`,
    `When you die, the treasury is split ${cfg.inheritance.holders}% to holders, ${cfg.inheritance.saviors}% to saviors (wallets that pulled you back from dying), ${cfg.inheritance.nextGeneration}% to your next generation.`,
    'Rules: write ONE post for X, max 260 characters, English, no hashtags, no links.',
    'Never give financial advice, never promise profits or price targets, never tell people to buy as an investment.',
    'Reply with the post text only.',
  ].join('\n');
}

async function askLLM(prompt, cfg) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': cfg.anthropicKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({ model: cfg.model, max_tokens: 200, messages: [{ role: 'user', content: prompt }] }),
  });
  if (!res.ok) throw new Error(`LLM ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return data.content?.map((c) => c.text ?? '').join('').trim();
}

/** kind: HEALTHY | ANXIOUS | DYING | COMA | DEAD | REBIRTH */
export async function writePost(kind, vitals, cfg, log = console) {
  const v = { ...vitals, persona: personaFor(vitals.generation) };
  if (kind === 'COMA') return fillTemplate('COMA', v, cfg); // coma posts are just the EKG line
  if (cfg.anthropicKey) {
    try {
      const text = await askLLM(buildPrompt(kind, v, cfg), cfg);
      if (text) return text.slice(0, 280);
    } catch (err) {
      log.warn?.(`[brain] LLM failed, using template: ${err.message}`);
    }
  }
  return fillTemplate(kind, v, cfg);
}
