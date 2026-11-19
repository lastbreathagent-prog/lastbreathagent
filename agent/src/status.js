// Life-state machine: HEALTHY -> ANXIOUS -> DYING -> COMA -> DEAD (-> reborn as next generation)

export const STATUS = {
  HEALTHY: 'HEALTHY',
  ANXIOUS: 'ANXIOUS',
  DYING: 'DYING',
  COMA: 'COMA',
  DEAD: 'DEAD',
};

const CRITICAL = new Set([STATUS.DYING, STATUS.COMA]);

/** Pure function: which status the agent should be in right now. */
export function computeStatus({ bpm, lastBeatAt, bornAt, now }, cfg) {
  const lastSignOfLife = lastBeatAt ?? bornAt;
  const silentFor = now - lastSignOfLife;
  if (silentFor >= cfg.deathAfterSec) return STATUS.DEAD;
  if (silentFor >= cfg.comaAfterSec) return STATUS.COMA;
  // Newborn grace: during its first hour the BPM window isn't full yet, so don't panic.
  if (now - bornAt < cfg.windowSec) return STATUS.HEALTHY;
  if (bpm >= cfg.thresholds.healthy) return STATUS.HEALTHY;
  if (bpm >= cfg.thresholds.anxious) return STATUS.ANXIOUS;
  return STATUS.DYING; // includes 0 beats in the last hour but < 6h of silence
}

/** Seconds left before death if nobody trades again. */
export function secondsToDeath({ lastBeatAt, bornAt, now }, cfg) {
  return Math.max(0, cfg.deathAfterSec - (now - (lastBeatAt ?? bornAt)));
}

/**
 * Applies a status change to the generation and records "Saviors":
 * the wallet whose beat lifted the agent out of DYING or COMA.
 * Returns {changed, from, to, saviors:[wallet]}
 */
export function applyStatus(gen, nextStatus, newBeats, now) {
  const from = gen.status;
  const result = { changed: from !== nextStatus, from, to: nextStatus, saviors: [] };
  if (!result.changed) return result;

  const recovered = CRITICAL.has(from) && !CRITICAL.has(nextStatus) && nextStatus !== STATUS.DEAD;
  const wokeFromComa = from === STATUS.COMA && nextStatus === STATUS.DYING;
  if ((recovered || wokeFromComa) && newBeats.length > 0) {
    // The first beat after the critical period is the one that saved it.
    const savior = newBeats[0].wallet;
    gen.saviors[savior] = (gen.saviors[savior] ?? 0) + 1;
    result.saviors.push(savior);
  }
  gen.status = nextStatus;
  gen.statusSince = now;
  gen.history.push({ from, to: nextStatus, at: gen.statusSince });
  return result;
}
