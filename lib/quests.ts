// Daily quests, pet evolution, and cosmetics — the reward scaffolding.
// Quest selection is deterministic per day so a reload keeps the same 3.

import type { Quest, QuestKey } from "./types";

// ---- pet evolution ----

export const PET_STAGES = [
  { name: "Egg", min: 0 },
  { name: "Blob", min: 150 },
  { name: "Sprout", min: 600 },
  { name: "Kirin", min: 1800 },
  { name: "Ascended", min: 5000 },
];

export function petStage(xp: number): number {
  let s = 0;
  for (let i = 0; i < PET_STAGES.length; i++) {
    if (xp >= PET_STAGES[i].min) s = i;
  }
  return s;
}

export function petStageName(xp: number): string {
  return PET_STAGES[petStage(xp)].name;
}

/** XP needed for the next evolution, or null if maxed. */
export function nextStageXp(xp: number): number | null {
  const s = petStage(xp);
  return s + 1 < PET_STAGES.length ? PET_STAGES[s + 1].min : null;
}

// ---- cosmetics ----

export interface Cosmetic {
  id: string;
  label: string;
  emoji: string;
  /** where it sits on the pet */
  slot: "head" | "face" | "neck";
}

export const COSMETICS: Cosmetic[] = [
  { id: "beanie", label: "Beanie", emoji: "🧢", slot: "head" },
  { id: "crown", label: "Crown", emoji: "👑", slot: "head" },
  { id: "halo", label: "Halo", emoji: "😇", slot: "head" },
  { id: "bow", label: "Bow", emoji: "🎀", slot: "head" },
  { id: "shades", label: "Shades", emoji: "🕶️", slot: "face" },
  { id: "scarf", label: "Scarf", emoji: "🧣", slot: "neck" },
];

export function cosmeticById(id: string): Cosmetic | undefined {
  return COSMETICS.find((c) => c.id === id);
}

// ---- quests ----

interface QuestDef {
  key: QuestKey;
  label: (n: number) => string;
  targets: number[];
}

const POOL: QuestDef[] = [
  { key: "reviews", label: (n) => `Clear ${n} reviews`, targets: [10, 15, 20] },
  { key: "shadow", label: (n) => `Shadow ${n} sentences`, targets: [3, 5, 7] },
  { key: "newwords", label: (n) => `Learn ${n} new words`, targets: [5, 8, 12] },
  { key: "combo", label: (n) => `Land a ${n}-answer combo`, targets: [5, 8, 12] },
  { key: "exchanges", label: (n) => `Survive ${n} Dojo exchanges`, targets: [5, 8, 10] },
];

function hashDate(date: string): number {
  let h = 2166136261;
  for (let i = 0; i < date.length; i++) {
    h ^= date.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Deterministic 3 quests for the given day. */
export function dailyQuests(date: string): Quest[] {
  const h = hashDate(date);
  const ordered = POOL.map((def, i) => ({
    def,
    r: (h ^ Math.imul(i + 1, 2654435761)) >>> 0,
  }))
    .sort((a, b) => a.r - b.r)
    .map((x) => x.def);

  return ordered.slice(0, 3).map((def, i) => {
    // >>> keeps the hash unsigned — a signed shift can go negative and index
    // targets[-1], yielding "Learn undefined new words" quests
    const target = def.targets[(h >>> (i * 4)) % def.targets.length];
    return {
      key: def.key,
      label: def.label(target),
      target,
      progress: 0,
      done: false,
    };
  });
}
