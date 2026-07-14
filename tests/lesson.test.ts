// Lesson builder: every exercise it emits must be answerable — the correct
// answer has to actually be among the options, or the learner is asked an
// impossible question and loses a heart for it.

import { describe, it, expect } from "vitest";
import { buildLesson, toLessonWords, typedCorrect, HEARTS, XP_PER_CORRECT, accuracyLabel } from "@/lib/lesson";
import { SEED } from "@/lib/seed";
import type { GrammarItem } from "@/lib/types";
import grammarJa from "@/data/grammar_ja.json";

const words = toLessonWords(SEED.ja.slice(0, 8));
const pool = toLessonWords(SEED.ja);
const grammar = grammarJa as GrammarItem[];

describe("buildLesson", () => {
  it("emits an answerable exercise for every kind", () => {
    for (let run = 0; run < 50; run++) {
      for (const ex of buildLesson(words, pool, grammar)) {
        switch (ex.kind) {
          case "mc":
            expect(ex.options).toHaveLength(4);
            expect(ex.options[ex.answer]).toBe(ex.word.meaning);
            expect(new Set(ex.options).size).toBe(4); // no duplicate distractors
            break;
          case "rmc":
            expect(ex.options).toHaveLength(4);
            expect(ex.options[ex.answer].word).toBe(ex.word.word);
            break;
          case "type":
            expect(ex.word.meaning).toBeTruthy();
            break;
          case "grammar":
            expect(ex.item.options[ex.item.answer]).toBeTruthy();
            expect(ex.item.note).toBeTruthy();
            break;
          case "match":
            expect(ex.pairs.length).toBeGreaterThan(0);
            break;
        }
      }
    }
  });

  it("covers every word in the unit", () => {
    const ex = buildLesson(words, pool, []);
    const covered = new Set(
      ex.flatMap((e) => (e.kind === "match" ? e.pairs.map((p) => p.word) : e.kind === "grammar" ? [] : [e.word.word]))
    );
    for (const w of words) expect(covered.has(w.word), `${w.word} never appears`).toBe(true);
  });

  it("folds in at most 2 grammar drills, and none when the pool is empty", () => {
    const withG = buildLesson(words, pool, grammar).filter((e) => e.kind === "grammar");
    expect(withG.length).toBeLessThanOrEqual(2);
    expect(withG.length).toBeGreaterThan(0);
    expect(buildLesson(words, pool, []).filter((e) => e.kind === "grammar")).toHaveLength(0);
  });

  it("ends on a match round (the cool-down)", () => {
    const ex = buildLesson(words, pool, grammar);
    expect(ex[ex.length - 1].kind).toBe("match");
  });

  it("carries the coaching tip through so a miss can teach", () => {
    // 水 has a tip in the seed; it must survive into the lesson word
    const w = toLessonWords(SEED.ja).find((x) => x.word === "水");
    expect(w?.tip).toBeTruthy();
  });
});

describe("typedCorrect is forgiving but not sloppy", () => {
  it("accepts exact, cased, and spaced variants", () => {
    expect(typedCorrect("water", "water")).toBe(true);
    expect(typedCorrect("  WATER ", "water")).toBe(true);
  });

  it("accepts any one of several comma-separated meanings", () => {
    expect(typedCorrect("listen", "to hear, to listen")).toBe(true);
    expect(typedCorrect("to hear", "to hear, to listen")).toBe(true);
  });

  it("ignores parenthetical qualifiers", () => {
    expect(typedCorrect("know", "to know (facts)")).toBe(true);
  });

  it("rejects empty and plainly wrong answers", () => {
    expect(typedCorrect("", "water")).toBe(false);
    expect(typedCorrect("   ", "water")).toBe(false);
    expect(typedCorrect("fire", "water")).toBe(false);
  });
});

describe("lesson constants", () => {
  it("has 5 hearts and 10 XP per correct", () => {
    expect(HEARTS).toBe(5);
    expect(XP_PER_CORRECT).toBe(10);
  });

  it("labels accuracy without crashing at the edges", () => {
    for (const pct of [0, 50, 60, 80, 100]) {
      expect(accuracyLabel(pct, "ja")).toBeTruthy();
      expect(accuracyLabel(pct, "de")).toBeTruthy();
    }
  });
});
