import jlptN5 from "@/data/jlpt_n5.json";
import jlptN4 from "@/data/jlpt_n4.json";
import jlptN5Gap from "@/data/jlpt_n5_gap.json";
import jlptN4Gap from "@/data/jlpt_n4_gap.json";
import jlptN5Gap2 from "@/data/jlpt_n5_gap2.json";
import jlptN4Gap2 from "@/data/jlpt_n4_gap2.json";
import goetheA1 from "@/data/goethe_a1.json";
import goetheA2 from "@/data/goethe_a2.json";
import goetheA1Gap from "@/data/goethe_a1_gap.json";
import goetheA2Gap from "@/data/goethe_a2_gap.json";
import goetheA1Gap2 from "@/data/goethe_a1_gap2.json";
import goetheA2Gap2 from "@/data/goethe_a2_gap2.json";
import type { Lang, VocabEntry } from "./types";

// Seed vocab is one flat, ORDER-STABLE list per language: earlier levels first,
// higher levels appended. `newIndex` walks it, so the Path and feed flow from
// N5 → N4 (and A1 → A2) automatically. Never reorder or splice earlier levels —
// only append — or existing users' progress pointers would drift.
//
// FUTURE LEVELS (N3, B1, …): sort the new level's entries by freqRank
// (ascending, nulls last) BEFORE appending it. Existing levels predate the
// frequency data and must never be re-sorted; the runtime compensates by
// dealing new words most-frequent-first WITHIN each Path unit (DEAL_ORDER
// below), which needs no reordering of the files.
interface Level {
  label: string;
  entries: VocabEntry[];
}

// The *_gap files are coverage-audit fills (scripts/gen-gap-entries.mjs +
// review): the most frequent words from the official exam lists that the
// original levels missed. They live AFTER the original levels because the
// pointer contract forbids inserting into an existing level — the label keeps
// the exam tag honest on cards, and each gap file is pre-sorted by freqRank.
// Each gap PASS is its own trailing level (gap, gap2, …): a later pass must
// never merge into an earlier one, or every seedIndex after it would shift.
const LEVELS: Record<Lang, Level[]> = {
  ja: [
    { label: "JLPT N5", entries: jlptN5 as VocabEntry[] },
    { label: "JLPT N4", entries: jlptN4 as VocabEntry[] },
    { label: "JLPT N5", entries: jlptN5Gap as VocabEntry[] },
    { label: "JLPT N4", entries: jlptN4Gap as VocabEntry[] },
    { label: "JLPT N5", entries: jlptN5Gap2 as VocabEntry[] },
    { label: "JLPT N4", entries: jlptN4Gap2 as VocabEntry[] },
  ],
  de: [
    { label: "GOETHE A1", entries: goetheA1 as VocabEntry[] },
    { label: "GOETHE A2", entries: goetheA2 as VocabEntry[] },
    { label: "GOETHE A1", entries: goetheA1Gap as VocabEntry[] },
    { label: "GOETHE A2", entries: goetheA2Gap as VocabEntry[] },
    { label: "GOETHE A1", entries: goetheA1Gap2 as VocabEntry[] },
    { label: "GOETHE A2", entries: goetheA2Gap2 as VocabEntry[] },
  ],
};

export const SEED: Record<Lang, VocabEntry[]> = {
  ja: LEVELS.ja.flatMap((l) => l.entries),
  de: LEVELS.de.flatMap((l) => l.entries),
};

// The level label that owns the seed entry at `index` (for the "NEW WORD · …" tag).
export function seedLevelLabel(lang: Lang, index: number): string {
  let acc = 0;
  for (const level of LEVELS[lang]) {
    acc += level.entries.length;
    if (index < acc) return level.label;
  }
  return LEVELS[lang][LEVELS[lang].length - 1].label;
}

// The label of the first (entry) level — kept for callers that want a generic tag.
export const SEED_LABEL: Record<Lang, string> = {
  ja: LEVELS.ja[0].label,
  de: LEVELS.de[0].label,
};

// ---- corpus frequency (gen-frequency.mjs writes freqRank onto entries) ----

/** The Path's unit size. Defined here (not path.ts) so DEAL_ORDER can be
 *  unit-scoped without a circular import; lib/path.ts re-exports it. */
export const UNIT_SIZE = 8;

export function seedFreqRank(lang: Lang, index: number): number | null {
  return SEED[lang][index]?.freqRank ?? null;
}

const rankByWord: Record<Lang, Map<string, number>> = { ja: new Map(), de: new Map() };
for (const lang of ["ja", "de"] as const) {
  for (const e of SEED[lang]) {
    if (e.freqRank != null && !rankByWord[lang].has(e.word)) rankByWord[lang].set(e.word, e.freqRank);
  }
}

/** freqRank looked up by word — for callers that don't carry a seed index. */
export function seedFreqRankByWord(lang: Lang, word: string): number | null {
  return rankByWord[lang].get(word) ?? null;
}

/** Muted tier chip label ("top 500" / "top 2000"), or null below the bar. */
export function freqTier(rank?: number | null): string | null {
  if (rank == null) return null;
  if (rank <= 500) return "top 500";
  if (rank <= 2000) return "top 2000";
  return null;
}

// Deal order: new words are dealt most-frequent-first WITHIN each Path unit
// (freqRank asc, nulls last, ties by seed index). The permutation is STRICTLY
// unit-local: `newIndex` stays a plain count of consumed entries, so unit
// boundaries, Path progress, and cross-level flow are byte-for-byte what they
// were — only the order inside a unit's 8 words changes.
function buildDealOrder(lang: Lang): number[] {
  const seed = SEED[lang];
  const order: number[] = [];
  for (let start = 0; start < seed.length; start += UNIT_SIZE) {
    const block = [];
    for (let i = start; i < Math.min(seed.length, start + UNIT_SIZE); i++) block.push(i);
    block.sort(
      (a, b) =>
        (seed[a].freqRank ?? Infinity) - (seed[b].freqRank ?? Infinity) || a - b
    );
    order.push(...block);
  }
  return order;
}

const DEAL_ORDER: Record<Lang, number[]> = {
  ja: buildDealOrder("ja"),
  de: buildDealOrder("de"),
};

const DEAL_POS: Record<Lang, number[]> = { ja: [], de: [] };
for (const lang of ["ja", "de"] as const) {
  DEAL_ORDER[lang].forEach((entryIndex, pos) => (DEAL_POS[lang][entryIndex] = pos));
}

/** The seed entry dealt at pointer position `pos` (identity beyond the seeds). */
export function dealIndexAt(lang: Lang, pos: number): number {
  return DEAL_ORDER[lang][pos] ?? pos;
}

/** Inverse of dealIndexAt — the pointer position that deals `entryIndex`. */
export function dealPosOf(lang: Lang, entryIndex: number): number {
  return DEAL_POS[lang][entryIndex] ?? entryIndex;
}
