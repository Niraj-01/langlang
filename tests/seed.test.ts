// THE load-bearing test.
//
// `newIndex` is a raw integer pointer into SEED[lang]. If anyone ever inserts,
// removes, or reorders a word in an existing level, every current user's saved
// pointer silently starts referring to a DIFFERENT word — their Path units and
// feed queue quietly corrupt, with no error anywhere. The seed contract is
// therefore APPEND-ONLY, and these tests are what enforce it.
//
// If a test here fails, do NOT "fix" it by updating the expected values unless
// you have genuinely only appended. Reordering/inserting is a data migration.

import { describe, it, expect } from "vitest";
import { SEED, seedLevelLabel, SEED_LABEL } from "@/lib/seed";
import jlptN5 from "@/data/jlpt_n5.json";
import jlptN4 from "@/data/jlpt_n4.json";
import goetheA1 from "@/data/goethe_a1.json";
import goetheA2 from "@/data/goethe_a2.json";

// Pinned prefixes — the words every existing user's early progress points at.
const JA_PREFIX = ["水", "食べる", "飲む", "行く", "来る", "見る", "聞く", "話す", "読む", "書く", "買う", "人"];
const DE_PREFIX = ["Wasser", "essen", "trinken", "gehen", "kommen", "sehen", "hören", "sprechen", "lesen", "schreiben", "kaufen", "Mann"];

// Sizes at the time of writing. The seed may only GROW.
const JA_MIN = 206; // 138 N5 + 68 N4
const DE_MIN = 210; // 142 A1 + 68 A2

describe("seed is append-only (protects users' newIndex pointers)", () => {
  it("keeps the Japanese prefix at the same indices", () => {
    expect(SEED.ja.slice(0, JA_PREFIX.length).map((e) => e.word)).toEqual(JA_PREFIX);
  });

  it("keeps the German prefix at the same indices", () => {
    expect(SEED.de.slice(0, DE_PREFIX.length).map((e) => e.word)).toEqual(DE_PREFIX);
  });

  it("never shrinks", () => {
    expect(SEED.ja.length).toBeGreaterThanOrEqual(JA_MIN);
    expect(SEED.de.length).toBeGreaterThanOrEqual(DE_MIN);
  });

  it("keeps earlier levels ahead of later ones (N5 before N4, A1 before A2)", () => {
    // the entry-level list must occupy indices 0..len-1 exactly, in order
    expect(SEED.ja.slice(0, jlptN5.length).map((e) => e.word)).toEqual(jlptN5.map((e) => e.word));
    expect(SEED.de.slice(0, goetheA1.length).map((e) => e.word)).toEqual(goetheA1.map((e) => e.word));
    // and the next level must follow immediately
    expect(SEED.ja.slice(jlptN5.length, jlptN5.length + jlptN4.length).map((e) => e.word)).toEqual(
      jlptN4.map((e) => e.word)
    );
    expect(SEED.de.slice(goetheA1.length, goetheA1.length + goetheA2.length).map((e) => e.word)).toEqual(
      goetheA2.map((e) => e.word)
    );
  });

  it("has no duplicate words within a language (a dupe breaks cardIdFor)", () => {
    for (const lang of ["ja", "de"] as const) {
      const words = SEED[lang].map((e) => e.word);
      expect(new Set(words).size).toBe(words.length);
    }
  });
});

describe("seedLevelLabel maps an index to the level that owns it", () => {
  it("labels the boundary indices correctly", () => {
    expect(seedLevelLabel("ja", 0)).toBe("JLPT N5");
    expect(seedLevelLabel("ja", jlptN5.length - 1)).toBe("JLPT N5");
    expect(seedLevelLabel("ja", jlptN5.length)).toBe("JLPT N4");
    expect(seedLevelLabel("de", 0)).toBe("GOETHE A1");
    expect(seedLevelLabel("de", goetheA1.length - 1)).toBe("GOETHE A1");
    expect(seedLevelLabel("de", goetheA1.length)).toBe("GOETHE A2");
  });

  it("clamps past the end instead of returning undefined", () => {
    expect(seedLevelLabel("ja", 99_999)).toBe("JLPT N4");
    expect(seedLevelLabel("de", 99_999)).toBe("GOETHE A2");
  });

  it("SEED_LABEL is the entry level", () => {
    expect(SEED_LABEL.ja).toBe("JLPT N5");
    expect(SEED_LABEL.de).toBe("GOETHE A1");
  });
});

describe("seed data integrity", () => {
  it("every entry has a word and a meaning", () => {
    for (const lang of ["ja", "de"] as const) {
      for (const e of SEED[lang]) {
        expect(e.word, `${lang} entry missing word`).toBeTruthy();
        expect(e.meaning, `${lang}:${e.word} missing meaning`).toBeTruthy();
      }
    }
  });

  it("every German noun carries an article and a plural (hard rule)", () => {
    for (const e of SEED.de) {
      if (e.pos !== "noun") continue;
      expect(["der", "die", "das"], `${e.word} has a bad article`).toContain(e.article);
      expect(e.plural, `${e.word} is a noun with no plural`).toBeTruthy();
    }
  });

  it("every Japanese entry has a kana reading", () => {
    for (const e of SEED.ja) {
      expect(e.reading, `${e.word} has no reading`).toBeTruthy();
    }
  });

  it("pitch accent, where present, is a sane mora index", () => {
    for (const e of SEED.ja) {
      if (e.pitch === undefined) continue;
      expect(Number.isInteger(e.pitch)).toBe(true);
      expect(e.pitch).toBeGreaterThanOrEqual(0);
      // 0 = heiban; otherwise the drop can't be past the end of the reading
      expect(e.pitch).toBeLessThanOrEqual([...(e.reading ?? "")].length);
    }
  });
});
