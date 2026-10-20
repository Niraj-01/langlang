// The /grammar reference: N5 patterns in teaching order, each with a short
// rule, examples, and practice drills that also flow into the feed/lessons.
// Readings are inline ruby (漢字[かんじ]) — a kanji without one silently loses
// its furigana, so coverage is pinned here.

import { describe, it, expect } from "vitest";
import grammarJa from "@/data/grammar_ja.json";
import type { GrammarItem } from "@/lib/types";
import { GRAMMAR_POINTS_JA, fillReading, grammarTag, parseRuby, rubyToKana, stripRuby } from "@/lib/grammar";

const POINTS = GRAMMAR_POINTS_JA;
const DRILLS = grammarJa as GrammarItem[];
const KANJI = /[㐀-䶿一-鿿豈-﫿々]/;
const sentences = (s: string) => s.split(/[.!?]\s/).filter(Boolean).length;

/** every Japanese string a point renders through RubyText */
function rubyStrings(p: (typeof POINTS)[number]): string[] {
  return [p.title, p.pattern, p.explain, ...p.forms.map((f) => f.ja), ...p.examples.map((e) => e.ja)];
}

describe("ruby notation", () => {
  it("splits kanji runs from their readings", () => {
    expect(parseRuby("私[わたし]は学生[がくせい]です。")).toEqual([
      { base: "私", ruby: "わたし" },
      { base: "は" },
      { base: "学生", ruby: "がくせい" },
      { base: "です。" },
    ]);
    expect(stripRuby("今日[きょう]は")).toBe("今日は");
    expect(rubyToKana("今日[きょう]は")).toBe("きょうは");
  });
});

describe("grammar points (ja)", () => {
  it("covers the N5 core in teaching order", () => {
    expect(POINTS.map((p) => p.id)).toEqual([
      "desu",
      "wa-no-mo-ka",
      "wo-ni-de-e",
      "masu",
      "i-adjectives",
      "na-adjectives",
      "aru-iru",
      "ga-to-kara-made",
      "numbers-time",
      "counters",
      "dictionary-form",
      "te-form",
      "te-kudasai",
      "te-mo-ii",
      "te-wa-ikemasen",
      "tai",
      "mashou",
      "comparison",
    ]);
  });

  it("every explanation obeys the 2-sentence rule", () => {
    for (const p of POINTS) expect(sentences(stripRuby(p.explain)), p.id).toBeLessThanOrEqual(2);
  });

  it("every pattern has 2–3 examples with romaji and English", () => {
    for (const p of POINTS) {
      expect(p.examples.length, p.id).toBeGreaterThanOrEqual(2);
      expect(p.examples.length, p.id).toBeLessThanOrEqual(3);
      for (const e of [...p.examples, ...p.forms]) {
        expect(e.romaji, e.ja).toBeTruthy();
        expect(e.en, e.ja).toBeTruthy();
      }
      expect(p.name && p.tag && p.romaji && p.pattern, p.id).toBeTruthy();
    }
  });

  it("every kanji carries a reading, so furigana never has a gap", () => {
    for (const p of POINTS) {
      for (const s of rubyStrings(p)) {
        const bare = parseRuby(s)
          .filter((seg) => !seg.ruby)
          .map((seg) => seg.base)
          .join("");
        expect(bare, `${p.id}: ${s}`).not.toMatch(KANJI);
        expect(bare, `${p.id}: stray bracket in ${s}`).not.toMatch(/[[\]]/);
        expect(rubyToKana(s), s).not.toMatch(KANJI);
      }
    }
  });

  it("uses no emoji (Phase 9: icons only)", () => {
    expect(JSON.stringify(POINTS)).not.toMatch(/\p{Extended_Pictographic}/u);
  });
});

describe("pattern drills", () => {
  const ids = new Set(POINTS.map((p) => p.id));

  it("every pattern has at least 3 practice drills", () => {
    for (const id of ids) {
      const n = DRILLS.filter((d) => d.pattern === id).length;
      expect(n, id).toBeGreaterThanOrEqual(3);
    }
  });

  it("every drill tag names a real pattern", () => {
    for (const d of DRILLS) if (d.pattern) expect(ids.has(d.pattern), d.prompt).toBe(true);
  });

  it("the kana line stays kana: options with kanji carry readings", () => {
    for (const d of DRILLS) {
      expect(d.promptReading, d.prompt).not.toMatch(KANJI);
      if (d.optionReadings) expect(d.optionReadings.length, d.prompt).toBe(d.options.length);
      for (let i = 0; i < d.options.length; i++) {
        expect(fillReading(d, i), `${d.prompt} / ${d.options[i]}`).not.toMatch(KANJI);
      }
    }
  });

  it("answers are spread across positions, not always the first option", () => {
    const tagged = DRILLS.filter((d) => d.pattern);
    const firsts = tagged.filter((d) => d.answer === 0).length;
    expect(firsts / tagged.length).toBeLessThan(0.5);
  });

  it("labels drill cards with the pattern tag", () => {
    const te = DRILLS.find((d) => d.pattern === "te-form")!;
    expect(grammarTag(te)).toBe("て-form");
    expect(grammarTag({ ...te, pattern: undefined })).toBe("particle");
  });
});
