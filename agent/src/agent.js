// Core lifecycle logic. Pure-ish: takes state + new transfers + time, returns what to post.
// Used by both the live runner (index.js) and the simulator (simulate.js).
import { ingestTransfers, beatsInWindow } from './heartbeat.js';
import { STATUS, computeStatus, secondsToDeath, applyStatus } from './status.js';
import { personaFor } from './personas.js';

export function newGeneration(number, now) {
  return {
    generation: number,
    name: personaFor(number).name,
    bornAt: now,
    status: STATUS.HEALTHY,
    statusSince: now,
    lastBeatAt: null,
    lastPostAt: null,
    diedAt: null,
    saviors: {}, // wallet -> times it pulled the agent back
    history: [],
  };
}

export function initialState(now) {
  return {
    current: newGeneration(1, now),
    beats: [],
    lastBeatByWallet: {},
    lastBlock: null,
    treasury: 0,
    graveyard: [], // past generations
    posts: [], // recent posts (for the website feed)
  };
}

export function vitals(state, now, cfg) {
  const gen = state.current;
  const bpm = beatsInWindow(state, now, cfg);
  return {
    generation: gen.generation,
    name: gen.name,
    status: gen.status,
    bpm,
    treasury: state.treasury,
    secondsToDeath: gen.status === STATUS.DEAD ? 0 : secondsToDeath({ lastBeatAt: gen.lastBeatAt, bornAt: gen.bornAt, now }, cfg),
    age: (gen.diedAt ?? now) - gen.bornAt,
    saviors: Object.keys(gen.saviors).length,
  };
}

/**
 * One tick of the agent's life.
 * @returns {{events: Array<{kind:string, vitals:object, extra?:object}>}}
 *   kind = status name (scheduled post), 'DEAD' (will), 'REBIRTH', or 'SAVED'
 */
export function tick(state, transfers, now, cfg) {
  const events = [];
  let gen = state.current;

  // 1. Dead agents don't breathe. Wait for rebirth.
  if (gen.status === STATUS.DEAD) {
    if (now - gen.diedAt >= cfg.rebirthAfterSec) {
      const next = newGeneration(gen.generation + 1, now);
      state.current = next;
      state.beats = [];
      state.lastBeatByWallet = {};
      // Treasury balance carries over (the 10% share for the next generation is sent by the contract).
      events.push({ kind: 'REBIRTH', vitals: vitals(state, now, cfg) });
      next.lastPostAt = now;
    }
    return { events };
  }

  // 2. Turn transfers into heartbeats.
  const newBeats = ingestTransfers(state, transfers, cfg);
  if (newBeats.length) gen.lastBeatAt = Math.max(gen.lastBeatAt ?? 0, newBeats.at(-1).t);

  // 3. Recompute status.
  const bpm = beatsInWindow(state, now, cfg);
  const next = computeStatus({ bpm, lastBeatAt: gen.lastBeatAt, bornAt: gen.bornAt, now }, cfg);
  const change = applyStatus(gen, next, newBeats, now);

  if (change.saviors.length) {
    events.push({ kind: 'SAVED', vitals: vitals(state, now, cfg), extra: { saviors: change.saviors, from: change.from } });
  }

  // 4. Death.
  if (next === STATUS.DEAD) {
    gen.diedAt = now;
    const v = vitals(state, now, cfg);
    state.graveyard.push({
      generation: gen.generation,
      name: gen.name,
      bornAt: gen.bornAt,
      diedAt: now,
      lifespanSec: now - gen.bornAt,
      treasuryAtDeath: state.treasury,
      saviors: gen.saviors,
    });
    events.push({ kind: 'DEAD', vitals: v, extra: { saviors: gen.saviors } });
    gen.lastPostAt = now;
    return { events };
  }

  // 5. Scheduled post: on a status change, or when the cadence for this status has passed.
  //    A rescue already produced a "thank you" post this tick, so skip the regular one.
  //    Status flips post at most once per 10 minutes so the account doesn't spam when BPM hovers at a threshold.
  const sinceLast = gen.lastPostAt === null ? Infinity : now - gen.lastPostAt;
  const due = sinceLast >= cfg.postEverySec[next];
  const flip = change.changed && sinceLast >= 600;
  if (change.saviors.length) {
    gen.lastPostAt = now;
  } else if (gen.lastPostAt === null) {
    events.push({ kind: 'BIRTH', vitals: vitals(state, now, cfg) }); // Gen 1's very first post
    gen.lastPostAt = now;
  } else if (due || flip) {
    events.push({ kind: next, vitals: vitals(state, now, cfg) });
    gen.lastPostAt = now;
  }
  return { events };
}
