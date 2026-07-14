// FSRS v5 scheduler — pure math, so it is cheap to pin down precisely.
// The scheduler decides when every card comes back; a silent regression here
// degrades the whole product with no visible error.

import { describe, it, expect } from "vitest";
import { newFsrsState, schedule, retrievability, MASTERY_STABILITY_DAYS } from "@/lib/fsrs";
import type { FsrsState, Rating } from "@/lib/types";

const NOW = Date.UTC(2026, 0, 1);
const MIN = 60_000;
const DAY = 86_400_000;

describe("newFsrsState", () => {
  it("starts a card in the 'new' phase, due immediately", () => {
    const s = newFsrsState(NOW);
    expect(s.phase).toBe("new");
    expect(s.reps).toBe(0);
    expect(s.lapses).toBe(0);
    expect(s.lastReview).toBeNull();
    expect(s.due).toBeLessThanOrEqual(NOW);
  });
});

describe("retrievability", () => {
  it("is ~1 immediately after review and decays monotonically", () => {
    expect(retrievability(0, 10)).toBeCloseTo(1, 5);
    const a = retrievability(1, 10);
    const b = retrievability(10, 10);
    const c = retrievability(100, 10);
    expect(a).toBeGreaterThan(b);
    expect(b).toBeGreaterThan(c);
    expect(c).toBeGreaterThan(0);
  });

  it("is ~0.9 at one stability-interval (desired retention)", () => {
    expect(retrievability(10, 10)).toBeCloseTo(0.9, 1);
  });
});

describe("schedule from a new card", () => {
  it("Again/Hard put the card into learning, due in minutes not days", () => {
    for (const rating of [1, 2] as Rating[]) {
      const s = schedule(newFsrsState(NOW), rating, NOW);
      expect(s.phase).toBe("learning");
      expect(s.reps).toBe(1);
      expect(s.due - NOW).toBeGreaterThan(0);
      expect(s.due - NOW).toBeLessThan(DAY); // short learning step
    }
  });

  it("Good/Easy graduate straight to review, due at least a day out", () => {
    for (const rating of [3, 4] as Rating[]) {
      const s = schedule(newFsrsState(NOW), rating, NOW);
      expect(s.phase).toBe("review");
      expect(s.stability).toBeGreaterThan(0);
      expect(s.due - NOW).toBeGreaterThanOrEqual(DAY - 1);
    }
  });

  it("Easy yields a longer first interval than Good", () => {
    const good = schedule(newFsrsState(NOW), 3, NOW);
    const easy = schedule(newFsrsState(NOW), 4, NOW);
    expect(easy.stability).toBeGreaterThan(good.stability);
  });
});

describe("schedule from review", () => {
  const reviewCard = (): FsrsState => ({
    ...newFsrsState(NOW),
    phase: "review",
    stability: 10,
    difficulty: 5,
    reps: 3,
    lastReview: NOW - 10 * DAY,
    due: NOW,
  });

  it("Again lapses the card into relearning and increments lapses", () => {
    const s = schedule(reviewCard(), 1, NOW);
    expect(s.phase).toBe("relearning");
    expect(s.lapses).toBe(1);
    expect(s.due - NOW).toBeLessThan(DAY); // comes right back
    expect(s.stability).toBeLessThan(10); // forgetting shrinks stability
  });

  it("Good keeps it in review and grows stability", () => {
    const s = schedule(reviewCard(), 3, NOW);
    expect(s.phase).toBe("review");
    expect(s.lapses).toBe(0);
    expect(s.stability).toBeGreaterThan(10);
  });

  it("difficulty stays clamped to 1..10 under repeated extremes", () => {
    let hard = reviewCard();
    let easy = reviewCard();
    for (let i = 0; i < 30; i++) {
      hard = schedule(hard, 1, NOW + i * DAY);
      easy = schedule(easy, 4, NOW + i * DAY);
    }
    for (const s of [hard, easy]) {
      expect(s.difficulty).toBeGreaterThanOrEqual(1);
      expect(s.difficulty).toBeLessThanOrEqual(10);
      expect(Number.isFinite(s.stability)).toBe(true);
      expect(s.stability).toBeGreaterThan(0);
    }
  });

  it("stability never goes non-finite or negative across a long random walk", () => {
    let s = newFsrsState(NOW);
    let t = NOW;
    for (let i = 0; i < 200; i++) {
      const rating = ((i % 4) + 1) as Rating;
      s = schedule(s, rating, t);
      t = s.due; // review exactly when due
      expect(Number.isFinite(s.stability)).toBe(true);
      expect(s.stability).toBeGreaterThan(0);
      expect(s.due).toBeGreaterThan(0);
    }
  });
});

describe("mastery threshold", () => {
  it("is 21 days of stability", () => {
    expect(MASTERY_STABILITY_DAYS).toBe(21);
  });
});
