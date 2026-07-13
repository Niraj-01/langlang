// Achievements — derived entirely from existing state, so there's nothing to
// store or migrate: a badge is "earned" the moment its predicate is true.

import type { AppState } from "./types";
import { UNIT_SIZE } from "./path";
import type { IconName } from "@/components/Icon";

export interface Badge {
  id: string;
  icon: IconName;
  label: string;
  hint: string;
  earned: (s: AppState) => boolean;
}

export const BADGES: Badge[] = [
  { id: "first-word", icon: "leaf", label: "First Word", hint: "Add a word to your deck", earned: (s) => s.cards.length >= 1 },
  { id: "unit-1", icon: "flag", label: "Unit 1 Clear", hint: "Finish the first Path unit", earned: (s) => s.newIndex.ja >= UNIT_SIZE || s.newIndex.de >= UNIT_SIZE },
  { id: "streak-3", icon: "flame", label: "3-Day Flame", hint: "3-day streak", earned: (s) => s.streak.longest >= 3 },
  { id: "streak-7", icon: "flame", label: "Week of Fire", hint: "7-day streak", earned: (s) => s.streak.longest >= 7 },
  { id: "streak-30", icon: "bolt", label: "Monthly Menace", hint: "30-day streak", earned: (s) => s.streak.longest >= 30 },
  { id: "xp-100", icon: "spark", label: "100 XP", hint: "Earn 100 XP total", earned: (s) => s.xp >= 100 },
  { id: "xp-1000", icon: "star", label: "1,000 XP", hint: "Earn 1,000 XP total", earned: (s) => s.xp >= 1000 },
  { id: "combo-10", icon: "bolt", label: "10x Combo", hint: "10 correct in a row", earned: (s) => s.bestCombo >= 10 },
  { id: "boss-1", icon: "swords", label: "Boss Slayer", hint: "Defeat any boss", earned: (s) => s.bossesCleared.length >= 1 },
  { id: "deck-50", icon: "layers", label: "Half-Century", hint: "50 cards in your deck", earned: (s) => s.cards.length >= 50 },
  { id: "collector", icon: "heart", label: "Collector", hint: "Save 5 favorites", earned: (s) => s.favorites.length >= 5 },
  { id: "polyglot", icon: "map", label: "Polyglot", hint: "Learn in both languages", earned: (s) => s.newIndex.ja > 0 && s.newIndex.de > 0 },
];

export const DAILY_GOALS = [10, 20, 50] as const;
