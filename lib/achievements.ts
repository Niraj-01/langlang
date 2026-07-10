// Achievements — derived entirely from existing state, so there's nothing to
// store or migrate: a badge is "earned" the moment its predicate is true.

import type { AppState } from "./types";
import { UNIT_SIZE } from "./path";

export interface Badge {
  id: string;
  emoji: string;
  label: string;
  hint: string;
  earned: (s: AppState) => boolean;
}

export const BADGES: Badge[] = [
  { id: "first-word", emoji: "🌱", label: "First Word", hint: "Add a word to your deck", earned: (s) => s.cards.length >= 1 },
  { id: "unit-1", emoji: "🎓", label: "Unit 1 Clear", hint: "Finish the first Path unit", earned: (s) => s.newIndex.ja >= UNIT_SIZE || s.newIndex.de >= UNIT_SIZE },
  { id: "streak-3", emoji: "🕯", label: "3-Day Flame", hint: "3-day streak", earned: (s) => s.streak.longest >= 3 },
  { id: "streak-7", emoji: "🔥", label: "Week of Fire", hint: "7-day streak", earned: (s) => s.streak.longest >= 7 },
  { id: "streak-30", emoji: "🌋", label: "Monthly Menace", hint: "30-day streak", earned: (s) => s.streak.longest >= 30 },
  { id: "xp-100", emoji: "✨", label: "100 XP", hint: "Earn 100 XP total", earned: (s) => s.xp >= 100 },
  { id: "xp-1000", emoji: "💫", label: "1,000 XP", hint: "Earn 1,000 XP total", earned: (s) => s.xp >= 1000 },
  { id: "combo-10", emoji: "⚡", label: "10x Combo", hint: "10 correct in a row", earned: (s) => s.bestCombo >= 10 },
  { id: "boss-1", emoji: "⚔️", label: "Boss Slayer", hint: "Defeat any boss", earned: (s) => s.bossesCleared.length >= 1 },
  { id: "deck-50", emoji: "🃏", label: "Half-Century", hint: "50 cards in your deck", earned: (s) => s.cards.length >= 50 },
  { id: "collector", emoji: "❤️", label: "Collector", hint: "Save 5 favorites", earned: (s) => s.favorites.length >= 5 },
  { id: "polyglot", emoji: "🌍", label: "Polyglot", hint: "Learn in both languages", earned: (s) => s.newIndex.ja > 0 && s.newIndex.de > 0 },
];

export const DAILY_GOALS = [10, 20, 50] as const;
