// Kana self-check: every question must be answerable (the right romaji is
// always among the options, exactly once), typed answers accept the common
// romanizations, and rounds score the first try only while still re-asking
// misses — and always terminate.

import { describe, it, expect } from "vitest";
import hiraganaData from "@/data/hiragana.json";
import katakanaData from "@/data/katakana.json";
import type { Kana } from "@/lib/types";
import {
  CHECK_LENGTH,
  MAX_MISSES,
  REPEAT_GAP,
  acceptedAnswers,
  answerRound,
  configKey,
  gradeTyped,
  kanaPool,
  newRound,
  passed,
  pickOptions,
  roundDone,
  sampleKana,
  scorePct,
  seenCount,
  type Round,
} from "@/lib/kanaQuiz";

const HIRA = hiraganaData as Kana[];
const KATA = katakanaData as Kana[];
const byChar = (c: string) => [...HIRA, ...KATA].find((k) => k.char === c)!;

// deterministic PRNG so a failing run is reproducible
function rng(seed: number) {
  return () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 2 ** 32;
  };
}

function play(r: Round, answers: (item: Round["queue"][number]) => boolean): Round {
  for (let guard = 0; !roundDone(r); guard++) {
    if (guard > 10_000) throw new Error("round never ended");
    r = answerRound(r, answers(r.queue[0]));
  }
  return r;
}

describe("kanaPool", () => {
  it("splits each alphabet into 46 basic / 25 dakuten / 33 combos", () => {
    expect(kanaPool(HIRA, KATA, "hiragana", ["basic"])).toHaveLength(46);
    expect(kanaPool(HIRA, KATA, "katakana", ["dakuten"])).toHaveLength(25);
    expect(kanaPool(HIRA, KATA, "hiragana", ["yoon"])).toHaveLength(33);
    expect(kanaPool(HIRA, KATA, "katakana", ["basic", "dakuten", "yoon"])).toHaveLength(104);
    expect(kanaPool(HIRA, KATA, "mixed", ["basic"])).toHaveLength(92);
  });
});

describe("gradeTyped", () => {
  it("accepts every chart romaji as exact", () => {
    for (const k of [...HIRA, ...KATA]) expect(gradeTyped(k, k.romaji)).toBe("exact");
  });

  it("ignores case, spaces and punctuation", () => {
    expect(gradeTyped(byChar("し"), "  SHI ")).toBe("exact");
    expect(gradeTyped(byChar("ん"), "n'")).toBe("exact");
    expect(gradeTyped(byChar("か"), "")).toBe("wrong");
    expect(gradeTyped(byChar("か"), "   ")).toBe("wrong");
  });

  it("accepts Kunrei / IME spellings as alternates", () => {
    expect(gradeTyped(byChar("し"), "si")).toBe("alt");
    expect(gradeTyped(byChar("ツ"), "tu")).toBe("alt");
    expect(gradeTyped(byChar("ふ"), "hu")).toBe("alt");
    expect(gradeTyped(byChar("を"), "o")).toBe("alt");
    expect(gradeTyped(byChar("ん"), "nn")).toBe("alt");
    expect(gradeTyped(byChar("しゃ"), "sya")).toBe("alt");
    expect(gradeTyped(byChar("ちょ"), "tyo")).toBe("alt");
    expect(gradeTyped(byChar("じゃ"), "jya")).toBe("alt");
    expect(gradeTyped(byChar("ぢ"), "di")).toBe("alt");
    expect(gradeTyped(byChar("づ"), "du")).toBe("alt");
  });

  it("does not over-accept", () => {
    expect(gradeTyped(byChar("じ"), "di")).toBe("wrong"); // di is ぢ, not じ
    expect(gradeTyped(byChar("お"), "wo")).toBe("wrong");
    expect(gradeTyped(byChar("さ"), "chi")).toBe("wrong");
    expect(gradeTyped(byChar("し"), "sh")).toBe("wrong");
  });

  it("lists the chart romaji first", () => {
    for (const k of HIRA) expect(acceptedAnswers(k)[0]).toBe(k.romaji);
  });
});

describe("pickOptions", () => {
  const pools = [
    kanaPool(HIRA, KATA, "hiragana", ["basic"]),
    kanaPool(HIRA, KATA, "katakana", ["dakuten"]),
    kanaPool(HIRA, KATA, "mixed", ["basic", "dakuten", "yoon"]),
  ];

  it("always has four distinct options with the answer exactly once", () => {
    const rand = rng(7);
    for (const pool of pools) {
      for (let run = 0; run < 20; run++) {
        for (const k of pool) {
          const opts = pickOptions(k, pool, rand);
          expect(opts).toHaveLength(4);
          expect(new Set(opts).size).toBe(4);
          expect(opts.filter((o) => o === k.romaji)).toHaveLength(1);
        }
      }
    }
  });

  it("leans on look-alikes and the plain/voiced pair", () => {
    const still = () => 0; // no jitter: pure similarity ranking
    const basic = kanaPool(HIRA, KATA, "hiragana", ["basic"]);
    expect(pickOptions(byChar("ぬ"), basic, still)).toContain("me");
    expect(pickOptions(byChar("シ"), kanaPool(HIRA, KATA, "katakana", ["basic"]), still)).toContain("tsu");
    const withVoiced = kanaPool(HIRA, KATA, "hiragana", ["basic", "dakuten"]);
    expect(pickOptions(byChar("が"), withVoiced, still)).toContain("ka");
    expect(pickOptions(byChar("ぱ"), withVoiced, still)).toContain("ba");
  });
});

describe("rounds", () => {
  const pool = kanaPool(HIRA, KATA, "hiragana", ["basic"]);
  const twenty = () => sampleKana(pool, CHECK_LENGTH, rng(42));

  it("samples distinct characters", () => {
    const s = twenty();
    expect(s).toHaveLength(CHECK_LENGTH);
    expect(new Set(s.map((k) => k.char)).size).toBe(CHECK_LENGTH);
    expect(sampleKana(pool, 999)).toHaveLength(pool.length);
  });

  it("a clean round scores 20/20", () => {
    const r = play(newRound(twenty()), () => true);
    expect(r.correct).toBe(20);
    expect(r.missed).toHaveLength(0);
    expect(scorePct(r)).toBe(100);
    expect(passed(r)).toBe(true);
  });

  it("re-asks a miss a few cards later without scoring it again", () => {
    const items = twenty();
    let r = answerRound(newRound(items), false);
    expect(r.queue[REPEAT_GAP]).toEqual({ kana: items[0], repeat: true });
    expect(r.queue).toHaveLength(items.length); // 19 left + the re-ask
    expect(r.missed).toEqual([items[0]]);
    r = play(r, () => true);
    expect(r.correct).toBe(19);
    expect(r.total).toBe(20);
  });

  it("puts the 90% line at 18 of 20", () => {
    const items = twenty();
    const missFirst = (n: number) => (q: Round["queue"][number]) =>
      q.repeat || items.indexOf(q.kana) >= n;
    expect(passed(play(newRound(items), missFirst(2)))).toBe(true); // 18/20
    const r = play(newRound(items), missFirst(3)); // 17/20
    expect(scorePct(r)).toBe(85);
    expect(passed(r)).toBe(false);
    expect(r.missed).toEqual(items.slice(0, 3));
  });

  it("stops re-asking after MAX_MISSES and always ends", () => {
    const items = twenty();
    let asked = 0;
    const r = play(newRound(items), () => (asked++, false));
    expect(asked).toBe(items.length * MAX_MISSES);
    expect(r.correct).toBe(0);
    expect(r.missed).toHaveLength(items.length);
  });

  it("counts progress by distinct characters", () => {
    let r = newRound(twenty());
    expect(seenCount(r)).toBe(0);
    r = answerRound(r, false); // re-ask queued, but the character was seen
    expect(seenCount(r)).toBe(1);
    r = answerRound(r, true);
    expect(seenCount(r)).toBe(2);
  });

  it("drill rounds are built from the misses", () => {
    const items = twenty();
    const first = play(newRound(items), (q) => q.repeat || items.indexOf(q.kana) >= 4);
    const drill = newRound(first.missed, "drill");
    expect(drill.kind).toBe("drill");
    expect(drill.total).toBe(4);
  });
});

describe("configKey", () => {
  it("ignores the order sets were toggled in", () => {
    expect(configKey("mixed", ["yoon", "basic"], 20)).toBe(configKey("mixed", ["basic", "yoon"], 20));
    expect(configKey("hiragana", ["basic"], 20)).not.toBe(configKey("katakana", ["basic"], 20));
  });
});
