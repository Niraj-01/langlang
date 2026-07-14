// i+1 sentence selection. The product promise is precise: a served sentence
// contains EXACTLY ONE word that isn't mastered, and that word is either due
// for review or the current new word. These tests pin the qualifying() logic
// with fabricated state, then sanity-check the generated Tatoeba data.

import { describe, it, expect } from "vitest";
import { qualifying, SENTENCES, KNOWN_STABILITY_DAYS } from "@/lib/sentences";
import { SEED } from "@/lib/seed";
import { newFsrsState } from "@/lib/fsrs";
import type { AppState, Card, SentenceData } from "@/lib/types";

const NOW = Date.UTC(2026, 6, 1);
const DAY = 86_400_000;

// fabricate a card for the seed word at index si
function card(si: number, opts: { stability: number; due: number }): Card {
  const entry = SEED.ja[si];
  return {
    id: `ja:${entry.word}`,
    lang: "ja",
    word: entry.word,
    meaning: entry.meaning,
    fsrs: { ...newFsrsState(NOW), phase: "review", stability: opts.stability, due: opts.due },
  } as Card;
}

// a minimal sentence whose mapped tokens reference the given seed indices
function sentence(indices: number[]): SentenceData {
  return {
    id: 1,
    text: indices.map((i) => SEED.ja[i].word).join(""),
    translation: "test",
    tokens: [
      ...indices.map((i) => ({ surface: SEED.ja[i].word, seedIndex: i })),
      { surface: "。", seedIndex: null },
    ],
  };
}

function state(cards: Card[], newIndex = 999): Pick<AppState, "cards" | "newIndex"> {
  return { cards, newIndex: { ja: newIndex, de: 0 } } as Pick<AppState, "cards" | "newIndex">;
}

describe("qualifying — the exactly-one-unknown invariant", () => {
  it("serves a sentence of known words + one due word, unknown = the due word", () => {
    const s = state([
      card(0, { stability: 10, due: NOW + 30 * DAY }), // known
      card(1, { stability: 2, due: NOW - DAY }), // due → the unknown
    ]);
    const picks = qualifying([sentence([0, 1])], s, "ja", NOW);
    expect(picks).toHaveLength(1);
    expect(picks[0].unknownSeedIndex).toBe(1);
  });

  it("rejects a sentence with two unknowns", () => {
    const s = state([
      card(0, { stability: 2, due: NOW - DAY }),
      card(1, { stability: 2, due: NOW - DAY }),
    ]);
    expect(qualifying([sentence([0, 1])], s, "ja", NOW)).toHaveLength(0);
  });

  it("rejects a sentence with zero unknowns (everything mastered)", () => {
    const s = state([
      card(0, { stability: 10, due: NOW + DAY }),
      card(1, { stability: 10, due: NOW + DAY }),
    ]);
    expect(qualifying([sentence([0, 1])], s, "ja", NOW)).toHaveLength(0);
  });

  it("rejects when a word is neither in the deck nor the current new word", () => {
    const s = state([card(0, { stability: 10, due: NOW + DAY })], /* newIndex */ 50);
    expect(qualifying([sentence([0, 3])], s, "ja", NOW)).toHaveLength(0);
  });

  it("accepts the current new word as the one unknown", () => {
    const s = state([card(0, { stability: 10, due: NOW + DAY })], /* newIndex */ 3);
    const picks = qualifying([sentence([0, 3])], s, "ja", NOW);
    expect(picks).toHaveLength(1);
    expect(picks[0].unknownSeedIndex).toBe(3);
  });

  it("rejects a learning-phase card that is not yet due", () => {
    const s = state([
      card(0, { stability: 10, due: NOW + DAY }),
      card(1, { stability: 2, due: NOW + DAY }), // in learning, comes back later
    ]);
    expect(qualifying([sentence([0, 1])], s, "ja", NOW)).toHaveLength(0);
  });

  it("treats the 7-day stability threshold exactly like the Path does", () => {
    expect(KNOWN_STABILITY_DAYS).toBe(7);
    const almost = state([
      card(0, { stability: 6.9, due: NOW - DAY }), // not known — but due, so it's the unknown
      card(1, { stability: 7, due: NOW - DAY }), // exactly 7 → known even while due
    ]);
    const picks = qualifying([sentence([0, 1])], almost, "ja", NOW);
    expect(picks).toHaveLength(1);
    expect(picks[0].unknownSeedIndex).toBe(0);
  });

  it("returns nothing for a fresh account (feed falls through)", () => {
    expect(qualifying(SENTENCES.ja, state([], 0), "ja", NOW).length).toBe(0);
  });
});

describe.each(["ja", "de"] as const)("generated sentence data (%s)", (lang) => {
  const data = SENTENCES[lang];

  it("ships a real pool, capped", () => {
    expect(data.length).toBeGreaterThan(300);
    expect(data.length).toBeLessThanOrEqual(1500);
  });

  it("every sentence has text, translation, and a Tatoeba id for attribution", () => {
    for (const s of data) {
      expect(s.id).toBeGreaterThan(0);
      expect(s.text).toBeTruthy();
      expect(s.translation).toBeTruthy();
    }
  });

  it("every mapped token points at a real seed entry", () => {
    for (const s of data) {
      for (const t of s.tokens) {
        if (t.seedIndex === null) continue;
        expect(t.seedIndex).toBeGreaterThanOrEqual(0);
        expect(t.seedIndex, `${s.text} → ${t.surface}`).toBeLessThan(SEED[lang].length);
      }
    }
  });

  it("every sentence references at least two seed words (one can be known)", () => {
    for (const s of data) {
      const distinct = new Set(s.tokens.filter((t) => t.seedIndex !== null).map((t) => t.seedIndex));
      expect(distinct.size, s.text).toBeGreaterThanOrEqual(2);
    }
  });

  it("has no duplicate sentences", () => {
    const texts = data.map((s) => s.text);
    expect(new Set(texts).size).toBe(texts.length);
  });
});

describe("qualifying against the real pool", () => {
  it("a learner with ~20 mastered words starts getting sentences, each with one unknown", () => {
    // master the first 20 seed words, make word 20 due — the classic mid-game state
    const cards = Array.from({ length: 20 }, (_, i) => card(i, { stability: 30, due: NOW + 90 * DAY }));
    cards.push(card(20, { stability: 1, due: NOW - DAY }));
    const s = state(cards, 21);
    const picks = qualifying(SENTENCES.ja, s, "ja", NOW);
    // every pick's unknown must be the due card or the current new word
    for (const p of picks) {
      expect([20, 21]).toContain(p.unknownSeedIndex);
    }
    expect(picks.length).toBeGreaterThan(0);
  });
});
