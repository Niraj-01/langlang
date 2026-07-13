import jlptN5 from "@/data/jlpt_n5.json";
import jlptN4 from "@/data/jlpt_n4.json";
import goetheA1 from "@/data/goethe_a1.json";
import goetheA2 from "@/data/goethe_a2.json";
import type { Lang, VocabEntry } from "./types";

// Seed vocab is one flat, ORDER-STABLE list per language: earlier levels first,
// higher levels appended. `newIndex` walks it, so the Path and feed flow from
// N5 → N4 (and A1 → A2) automatically. Never reorder or splice earlier levels —
// only append — or existing users' progress pointers would drift.
interface Level {
  label: string;
  entries: VocabEntry[];
}

const LEVELS: Record<Lang, Level[]> = {
  ja: [
    { label: "JLPT N5", entries: jlptN5 as VocabEntry[] },
    { label: "JLPT N4", entries: jlptN4 as VocabEntry[] },
  ],
  de: [
    { label: "GOETHE A1", entries: goetheA1 as VocabEntry[] },
    { label: "GOETHE A2", entries: goetheA2 as VocabEntry[] },
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
