// Frequency layer: freqRank must NEVER change seed order (append-only
// contract — the snapshot below is the tripwire), and the unit-local deal
// order must stay a clean permutation so `newIndex` keeps meaning "how many
// words consumed" everywhere (Path boundaries, achievements, sync).

import { describe, it, expect } from "vitest";
import {
  SEED,
  UNIT_SIZE,
  seedFreqRank,
  seedFreqRankByWord,
  freqTier,
  dealIndexAt,
  dealPosOf,
} from "@/lib/seed";
import { nextFeedItem } from "@/lib/feed";
import type { AppState, Lang } from "@/lib/types";

const LANGS: Lang[] = ["ja", "de"];

describe("seed order is untouched by the frequency pass", () => {
  it("ja word order matches the pinned snapshot", () => {
    expect(SEED.ja.map((e) => e.word)).toMatchSnapshot();
  });
  it("de word order matches the pinned snapshot", () => {
    expect(SEED.de.map((e) => e.word)).toMatchSnapshot();
  });
});

describe("freqRank data", () => {
  it("covers most entries and is a positive rank or null", () => {
    for (const lang of LANGS) {
      let ranked = 0;
      for (const e of SEED[lang]) {
        expect("freqRank" in e, `${lang}:${e.word} missing freqRank field`).toBe(true);
        if (e.freqRank != null) {
          expect(e.freqRank).toBeGreaterThan(0);
          ranked++;
        }
      }
      expect(ranked / SEED[lang].length).toBeGreaterThan(0.8);
    }
  });

  it("seedFreqRank / seedFreqRankByWord agree", () => {
    for (const lang of LANGS) {
      expect(seedFreqRank(lang, 0)).toBe(SEED[lang][0].freqRank ?? null);
      expect(seedFreqRankByWord(lang, SEED[lang][0].word)).toBe(SEED[lang][0].freqRank ?? null);
    }
    expect(seedFreqRankByWord("ja", "not-a-word")).toBeNull();
  });

  it("freqTier buckets", () => {
    expect(freqTier(1)).toBe("top 500");
    expect(freqTier(500)).toBe("top 500");
    expect(freqTier(501)).toBe("top 2000");
    expect(freqTier(2000)).toBe("top 2000");
    expect(freqTier(2001)).toBeNull();
    expect(freqTier(null)).toBeNull();
    expect(freqTier(undefined)).toBeNull();
  });
});

describe("unit-local deal order", () => {
  it("is a permutation that never crosses unit boundaries", () => {
    for (const lang of LANGS) {
      const n = SEED[lang].length;
      const seen = new Set<number>();
      for (let pos = 0; pos < n; pos++) {
        const idx = dealIndexAt(lang, pos);
        expect(seen.has(idx), `${lang}: duplicate deal of ${idx}`).toBe(false);
        seen.add(idx);
        // same unit block as the position itself
        expect(Math.floor(idx / UNIT_SIZE)).toBe(Math.floor(pos / UNIT_SIZE));
      }
      expect(seen.size).toBe(n);
    }
  });

  it("deals most-frequent-first within each unit (nulls last, ties by index)", () => {
    for (const lang of LANGS) {
      const n = SEED[lang].length;
      for (let pos = 0; pos + 1 < n; pos++) {
        if (Math.floor(pos / UNIT_SIZE) !== Math.floor((pos + 1) / UNIT_SIZE)) continue;
        const a = seedFreqRank(lang, dealIndexAt(lang, pos)) ?? Infinity;
        const b = seedFreqRank(lang, dealIndexAt(lang, pos + 1)) ?? Infinity;
        expect(a, `${lang} pos ${pos}`).toBeLessThanOrEqual(b);
      }
    }
  });

  it("dealPosOf inverts dealIndexAt, identity beyond the seeds", () => {
    for (const lang of LANGS) {
      for (let pos = 0; pos < SEED[lang].length; pos++) {
        expect(dealPosOf(lang, dealIndexAt(lang, pos))).toBe(pos);
      }
      expect(dealIndexAt(lang, 99999)).toBe(99999);
      expect(dealPosOf(lang, 99999)).toBe(99999);
    }
  });

  it("the feed deals the unit's best-ranked word first on a fresh state", () => {
    const state = { lang: "ja", cards: [], newIndex: { ja: 0, de: 0 } } as unknown as AppState;
    const ctx = {
      recentKinds: [],
      queuedCardIds: new Set<string>(),
      queuedNewCount: 0,
      lastWasFail: false,
      sinceStatus: 0,
    };
    for (let i = 0; i < 50; i++) {
      const item = nextFeedItem(state, ctx);
      if (item.kind === "new") {
        expect(item.entryIndex).toBe(dealIndexAt("ja", 0));
        return;
      }
    }
    throw new Error("feed never dealt a new word in 50 tries");
  });
});
