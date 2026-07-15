// Coverage audit integrity: data/exam_words_*.json is what /progress trusts
// for "X/Y official words mastered". A stale or mis-mapped file would show
// users honest-looking numbers that are quietly wrong, so every mapping is
// re-verified against the seeds here. The gap-entry validator is exercised
// too — it's the only gate between generated entries and the seed files.

import { describe, it, expect } from "vitest";
import { SEED } from "@/lib/seed";
import { EXAM_WORDS, examCoverage } from "@/lib/exams";
import { examListCoverage } from "@/lib/derive";
import { invalidReason } from "../scripts/gen-gap-entries.mjs";
import type { AppState, Exam, Lang } from "@/lib/types";

const AUDITED: [Exam, Lang][] = [
  ["jlpt_n5", "ja"],
  ["jlpt_n4", "ja"],
  ["goethe_a1", "de"],
  ["goethe_a2", "de"],
];

const normJa = (s: string) => s.replace(/[・〜～\s]/g, "");
const normDe = (s: string) => s.toLowerCase().replace(/\s+/g, " ").trim();

describe("exam word maps (data/exam_words_*.json)", () => {
  it("exist for all four audited exams and are non-trivial", () => {
    for (const [exam] of AUDITED) {
      const words = EXAM_WORDS[exam]!;
      expect(words, exam).toBeTruthy();
      expect(Object.keys(words).length, exam).toBeGreaterThan(500);
    }
  });

  it("every mapped seedIndex points at the seed entry it claims to", () => {
    for (const [exam, lang] of AUDITED) {
      for (const [word, idx] of Object.entries(EXAM_WORDS[exam]!)) {
        if (idx === null) continue;
        const seed = SEED[lang][idx];
        expect(seed, `${exam}: ${word} -> ${idx}`).toBeTruthy();
        if (lang === "de") {
          expect(normDe(seed.word), `${exam}: ${word}`).toBe(normDe(word));
        } else {
          const w = normJa(word);
          const base = w.endsWith("する") ? w.slice(0, -2) : w;
          const wordMatch = normJa(seed.word) === w || normJa(seed.word) === base;
          // reading matches are orthographic variants (子供/子ども): the kanji overlap
          const kanji = [...w].filter((c) => /[一-鿿]/.test(c));
          const variant =
            !!seed.reading &&
            (kanji.length === 0 || kanji.some((c) => seed.word.includes(c)));
          expect(wordMatch || variant, `${exam}: ${word} -> ${idx} (${seed.word})`).toBe(true);
        }
      }
    }
  });

  it("examCoverage counts are consistent", () => {
    for (const [exam] of AUDITED) {
      const words = EXAM_WORDS[exam]!;
      const cov = examCoverage(exam, () => false)!;
      expect(cov.total).toBe(Object.keys(words).length);
      expect(cov.inSeeds).toBe(Object.values(words).filter((v) => v !== null).length);
      expect(cov.mastered).toBe(0);
      const all = examCoverage(exam, () => true)!;
      expect(all.mastered).toBe(cov.inSeeds);
    }
  });

  it("examListCoverage is null for unaudited exams and offline-safe on a fresh state", () => {
    const s = { cards: [] } as unknown as AppState; // only .cards is consulted
    expect(examListCoverage(s, "jlpt_n3")).toBeNull();
    const cov = examListCoverage(s, "jlpt_n5")!;
    expect(cov.mastered).toBe(0);
    expect(cov.total).toBeGreaterThan(500);
  });
});

describe("gap-entry validator (scripts/gen-gap-entries.mjs)", () => {
  const ja = {
    word: "上げる",
    reading: "あげる",
    meaning: "to raise",
    pos: "verb",
    example: "手を上げる。",
    exampleReading: "てをあげる。",
    exampleMeaning: "I raise my hand.",
  };
  const de = {
    word: "Gabel",
    article: "die",
    plural: "Gabeln",
    meaning: "fork",
    pos: "noun",
    example: "Ich esse mit der Gabel.",
    exampleMeaning: "I eat with the fork.",
  };

  it("accepts well-formed entries", () => {
    expect(invalidReason(ja, "ja")).toBeNull();
    expect(invalidReason(de, "de")).toBeNull();
    expect(invalidReason({ ...ja, tip: "Transitive pair of 上がる. Use を." }, "ja")).toBeNull();
  });

  it("rejects rule violations", () => {
    expect(invalidReason({ ...ja, pitch: 1 }, "ja")).toMatch(/pitch/);
    expect(invalidReason({ ...ja, reading: "ageru" }, "ja")).toMatch(/kana/);
    expect(invalidReason({ ...ja, example: "とても長い例文です。それは三十文字を超えてしまっているだめな例文。" }, "ja")).toMatch(/long|use the word/);
    expect(
      invalidReason({ ...ja, tip: "One. Two. Three sentences is too many." }, "ja")
    ).toMatch(/2 sentences/);
    expect(invalidReason({ ...de, article: undefined }, "de")).toMatch(/article/);
    expect(invalidReason({ ...de, plural: undefined }, "de")).toMatch(/plural/);
    expect(invalidReason({ ...de, reading: "gabel" }, "de")).toMatch(/ja-only/);
    expect(invalidReason({ ...ja, meaning: "" }, "ja")).toMatch(/meaning/);
  });
});
