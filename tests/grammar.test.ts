// Grammar drills are rendered by filling ＿ in the prompt with the chosen
// option. A bad answer index or a missing blank makes an unanswerable card, so
// the shape is worth pinning.

import { describe, it, expect } from "vitest";
import grammarJa from "@/data/grammar_ja.json";
import grammarDe from "@/data/grammar_de.json";
import type { GrammarItem } from "@/lib/types";

const SETS: Record<string, GrammarItem[]> = {
  ja: grammarJa as GrammarItem[],
  de: grammarDe as GrammarItem[],
};

describe.each(Object.entries(SETS))("grammar_%s", (lang, items) => {
  it("has enough drills that the feed doesn't repeat immediately", () => {
    // grammar is ~11% of the feed; below ~25 the repeats get obvious fast
    expect(items.length).toBeGreaterThanOrEqual(25);
  });

  it("every prompt has exactly one blank to fill", () => {
    for (const g of items) {
      expect(g.prompt.split("＿").length - 1, g.prompt).toBe(1);
    }
  });

  it("every answer index points at a real option", () => {
    for (const g of items) {
      expect(g.answer, g.prompt).toBeGreaterThanOrEqual(0);
      expect(g.answer, g.prompt).toBeLessThan(g.options.length);
      expect(g.options[g.answer], g.prompt).toBeTruthy();
    }
  });

  it("options are distinct (a duplicate makes two 'correct' answers)", () => {
    for (const g of items) {
      expect(new Set(g.options).size, g.prompt).toBe(g.options.length);
    }
  });

  it("every drill teaches: it carries a why-note and a translation", () => {
    for (const g of items) {
      expect(g.note, g.prompt).toBeTruthy();
      expect(g.translation, g.prompt).toBeTruthy();
      // the coaching rule: max 2 sentences
      expect(g.note.split(/[.!?]\s/).filter(Boolean).length, g.note).toBeLessThanOrEqual(2);
    }
  });

  it("is tagged with the right language", () => {
    for (const g of items) expect(g.lang).toBe(lang);
  });

  it("has no duplicate prompts", () => {
    const prompts = items.map((g) => g.prompt);
    expect(new Set(prompts).size).toBe(prompts.length);
  });
});

describe("grammar_ja readings", () => {
  it("every Japanese drill has a kana reading with the same blank", () => {
    for (const g of SETS.ja) {
      expect(g.promptReading, g.prompt).toBeTruthy();
      expect(g.promptReading!.split("＿").length - 1, g.prompt).toBe(1);
    }
  });
});
