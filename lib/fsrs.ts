// FSRS v5 scheduler — ported from the open-spaced-repetition spec
// https://github.com/open-spaced-repetition/fsrs4anki/wiki/The-Algorithm

import type { FsrsState, Rating } from "./types";

// FSRS-5 default parameters (19 weights)
const W = [
  0.40255, 1.18385, 3.173, 15.69105, 7.1949, 0.5345, 1.4604, 0.0046, 1.54575,
  0.1192, 1.01925, 1.9395, 0.11, 0.29605, 2.2698, 0.2315, 2.9898, 0.51655,
  0.6621,
];

const DECAY = -0.5;
const FACTOR = Math.pow(0.9, 1 / DECAY) - 1; // 19/81
const DESIRED_RETENTION = 0.9;
const MAX_INTERVAL_DAYS = 365;
const LEARN_STEP_MS = 10 * 60 * 1000; // 10 min

const DAY_MS = 24 * 60 * 60 * 1000;

const clamp = (x: number, lo: number, hi: number) =>
  Math.min(hi, Math.max(lo, x));

export function newFsrsState(now = Date.now()): FsrsState {
  return {
    phase: "new",
    stability: 0,
    difficulty: 0,
    due: now,
    lastReview: null,
    reps: 0,
    lapses: 0,
  };
}

/** Probability of recall after `elapsedDays` at stability S. */
export function retrievability(elapsedDays: number, stability: number): number {
  if (stability <= 0) return 0;
  return Math.pow(1 + (FACTOR * Math.max(0, elapsedDays)) / stability, DECAY);
}

/** Interval (days) at which retrievability drops to the desired retention. */
function nextIntervalDays(stability: number): number {
  const ivl =
    (stability / FACTOR) * (Math.pow(DESIRED_RETENTION, 1 / DECAY) - 1);
  return clamp(Math.round(ivl), 1, MAX_INTERVAL_DAYS);
}

function initStability(g: Rating): number {
  return Math.max(W[g - 1], 0.1);
}

function initDifficulty(g: Rating): number {
  return clamp(W[4] - Math.exp(W[5] * (g - 1)) + 1, 1, 10);
}

function nextDifficulty(d: number, g: Rating): number {
  const deltaD = -W[6] * (g - 3);
  const dPrime = d + deltaD * ((10 - d) / 9); // linear damping
  const meanReverted = W[7] * initDifficulty(4) + (1 - W[7]) * dPrime;
  return clamp(meanReverted, 1, 10);
}

function recallStability(d: number, s: number, r: number, g: Rating): number {
  const hardPenalty = g === 2 ? W[15] : 1;
  const easyBonus = g === 4 ? W[16] : 1;
  return (
    s *
    (1 +
      Math.exp(W[8]) *
        (11 - d) *
        Math.pow(s, -W[9]) *
        (Math.exp(W[10] * (1 - r)) - 1) *
        hardPenalty *
        easyBonus)
  );
}

function forgetStability(d: number, s: number, r: number): number {
  const sf =
    W[11] *
    Math.pow(d, -W[12]) *
    (Math.pow(s + 1, W[13]) - 1) *
    Math.exp(W[14] * (1 - r));
  return Math.min(sf, s);
}

/** Same-day (short-term) stability update. */
function shortTermStability(s: number, g: Rating): number {
  return s * Math.exp(W[17] * (g - 3 + W[18]));
}

function fuzz(days: number): number {
  if (days < 3) return days;
  const spread = Math.max(1, Math.round(days * 0.05));
  return days + Math.floor(Math.random() * (2 * spread + 1)) - spread;
}

/** Apply a rating to a card's FSRS state, returning the new state. */
export function schedule(
  prev: FsrsState,
  rating: Rating,
  now = Date.now()
): FsrsState {
  const next: FsrsState = { ...prev, reps: prev.reps + 1, lastReview: now };

  if (prev.phase === "new") {
    next.stability = initStability(rating);
    next.difficulty = initDifficulty(rating);
    if (rating <= 2) {
      next.phase = "learning";
      next.due = now + LEARN_STEP_MS;
    } else {
      next.phase = "review";
      next.due = now + fuzz(nextIntervalDays(next.stability)) * DAY_MS;
    }
    return next;
  }

  const elapsedDays = prev.lastReview
    ? (now - prev.lastReview) / DAY_MS
    : 0;
  const r = retrievability(elapsedDays, prev.stability);

  if (prev.phase === "learning" || prev.phase === "relearning") {
    // Same-day steps use the short-term memory formula
    next.stability =
      elapsedDays < 1
        ? shortTermStability(prev.stability, rating)
        : rating === 1
          ? forgetStability(prev.difficulty, prev.stability, r)
          : recallStability(prev.difficulty, prev.stability, r, rating);
    next.difficulty = nextDifficulty(prev.difficulty, rating);
    if (rating <= 2) {
      next.due = now + LEARN_STEP_MS;
    } else {
      next.phase = "review";
      next.due = now + fuzz(nextIntervalDays(next.stability)) * DAY_MS;
    }
    return next;
  }

  // phase === "review"
  next.difficulty = nextDifficulty(prev.difficulty, rating);
  if (rating === 1) {
    next.phase = "relearning";
    next.lapses = prev.lapses + 1;
    next.stability = forgetStability(prev.difficulty, prev.stability, r);
    next.due = now + LEARN_STEP_MS;
  } else {
    next.stability = recallStability(prev.difficulty, prev.stability, r, rating);
    next.due = now + fuzz(nextIntervalDays(next.stability)) * DAY_MS;
  }
  return next;
}

/** FSRS stability above this = "mastered" for coverage bars (phase 4). */
export const MASTERY_STABILITY_DAYS = 21;
