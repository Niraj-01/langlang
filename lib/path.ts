// The Path — a Duolingo-style unit roadmap derived from the seed vocab.
// Units are consecutive slices of the seed list; the frontier is newIndex
// (how far the feed has dealt new words), so the path needs no storage of
// its own. Every few units a boss checkpoint from data/scenarios.ts appears.

import { SEED } from "@/lib/seed";
import { bossesFor } from "@/data/scenarios";
import { cardIdFor } from "@/lib/store";
import type { AppState, Lang, VocabEntry } from "@/lib/types";

export const UNIT_SIZE = 8;
const UNITS_PER_BOSS = 4;

const UNIT_EMOJI: Record<Lang, string[]> = {
  ja: ["🌱", "🍜", "🚉", "🗻", "🎎", "🌊", "🏮", "🦊", "🌸", "🎋", "⛩", "🎌", "🍡", "🏯"],
  de: ["🌱", "🥨", "🚂", "🏰", "🍺", "⚽", "🌲", "🦁", "🎻", "🚲", "⛰", "🧀", "🥖", "🎭"],
};

export type PathNodeState = "done" | "current" | "locked";

export interface PathNode {
  key: string;
  kind: "unit" | "boss";
  title: string;
  emoji: string;
  state: PathNodeState;
  /** unit nodes */
  words?: VocabEntry[];
  stars?: 0 | 1 | 2 | 3;
  /** boss nodes */
  bossId?: string;
  setting?: string;
}

export function buildPath(s: AppState, lang: Lang): PathNode[] {
  const seed = SEED[lang];
  const frontier = s.newIndex[lang];
  const bosses = bossesFor(lang);
  const cardById = new Map(s.cards.map((c) => [c.id, c]));
  const unitCount = Math.ceil(seed.length / UNIT_SIZE);
  const nodes: PathNode[] = [];
  let bossIdx = 0;

  for (let u = 0; u < unitCount; u++) {
    const start = u * UNIT_SIZE;
    const end = Math.min(seed.length, start + UNIT_SIZE);
    const words = seed.slice(start, end);
    const state: PathNodeState =
      frontier >= end ? "done" : frontier >= start ? "current" : "locked";

    let stars: 0 | 1 | 2 | 3 = 0;
    if (state === "done") {
      const solid = words.filter((w) => {
        const c = cardById.get(cardIdFor(lang, w.word));
        return c && c.fsrs.stability >= 7;
      }).length;
      const r = solid / words.length;
      stars = r >= 0.85 ? 3 : r >= 0.5 ? 2 : r > 0 ? 1 : 0;
    }

    nodes.push({
      key: `unit-${u}`,
      kind: "unit",
      title: `Unit ${u + 1}`,
      emoji: UNIT_EMOJI[lang][u % UNIT_EMOJI[lang].length],
      state,
      words,
      stars,
    });

    // boss checkpoint after every block of units, unlocked once the block is done
    if ((u + 1) % UNITS_PER_BOSS === 0 && bossIdx < bosses.length) {
      const b = bosses[bossIdx++];
      const cleared = s.bossesCleared.includes(b.id);
      nodes.push({
        key: b.id,
        kind: "boss",
        title: b.title,
        emoji: b.boss?.avatar ?? "👹",
        bossId: b.id,
        setting: b.setting,
        state: cleared ? "done" : state === "done" ? "current" : "locked",
      });
    }
  }
  return nodes;
}

// ---- streak milestones (Duolingo-style) ----

export const STREAK_MILESTONES = [3, 7, 14, 30, 50, 100, 365];

export function nextMilestone(current: number): number {
  return STREAK_MILESTONES.find((m) => m > current) ?? current + 100;
}

/** Last 7 calendar days (oldest first) with whether the streak was alive. */
export function streakWeek(s: AppState): { date: string; label: string; active: boolean }[] {
  const out: { date: string; label: string; active: boolean }[] = [];
  for (let i = 6; i >= 0; i--) {
    const dt = new Date(Date.now() - i * 86400000);
    const date = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
    const logged = s.log[date];
    const active =
      (logged ? logged.xp > 0 || logged.reviews > 0 || logged.newWords > 0 : false) ||
      (s.today.date === date && (s.today.xp > 0 || s.today.reviews > 0 || s.today.newWords > 0)) ||
      s.streak.lastActive === date;
    out.push({
      date,
      label: dt.toLocaleDateString("en-US", { weekday: "short" })[0],
      active,
    });
  }
  return out;
}
