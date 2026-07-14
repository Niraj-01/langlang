// Derived selectors — pure, state-in/value-out. Nothing here touches the store
// singleton, localStorage, or the network, which is exactly why they live apart
// from lib/store.ts: they are trivially testable and safely reusable.
//
// store.ts re-exports every one of these, so callers keep importing from
// "@/lib/store" as before.

import type { AppState, Card, DayStats, Lang } from "./types";
import { MASTERY_STABILITY_DAYS } from "./fsrs";

const DAY_MS = 86_400_000;

/** Local calendar day as yyyy-mm-dd. All day-keyed state uses this. */
export function todayStr(d = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Cards due for review now. New cards are born due (newFsrsState), so a
 *  just-added word is picked up immediately — no phase special-case needed. */
export function dueCards(s: AppState, lang: Lang, now = Date.now()): Card[] {
  return s.cards
    .filter((c) => c.lang === lang && c.fsrs.due <= now)
    .sort((a, b) => a.fsrs.due - b.fsrs.due);
}

/** Cards whose FSRS stability clears the mastery threshold. */
export function masteredCount(s: AppState, lang: Lang): number {
  return s.cards.filter((c) => c.lang === lang && c.fsrs.stability >= MASTERY_STABILITY_DAYS).length;
}

export function activeVocab(s: AppState, lang: Lang): number {
  return s.cards.filter((c) => c.lang === lang && c.type !== "sentence").length;
}

/** Ordered [date, stats] for the last `days` days (missing days omitted). */
export function logRange(s: AppState, days: number): { date: string; stats: DayStats }[] {
  const out: { date: string; stats: DayStats }[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const date = todayStr(new Date(Date.now() - i * DAY_MS));
    const stats = date === s.today.date ? s.today : s.log[date];
    if (stats) out.push({ date, stats });
  }
  return out;
}

export function weeklyStats(s: AppState) {
  const days = logRange(s, 7);
  const sum = days.reduce(
    (a, { stats }) => ({
      reviews: a.reviews + stats.reviews,
      correct: a.correct + stats.correct,
      newWords: a.newWords + stats.newWords,
      xp: a.xp + stats.xp,
      speaks: a.speaks + (stats.speaks ?? 0),
    }),
    { reviews: 0, correct: 0, newWords: 0, xp: 0, speaks: 0 }
  );
  // rough practice minutes: reviews ~4s, speaks ~7s, new words ~3s
  const minutes = Math.round((sum.reviews * 4 + sum.speaks * 7 + sum.newWords * 3) / 60);
  const activeDays = days.filter(({ stats }) => stats.reviews || stats.newWords || stats.speaks).length;
  return { ...sum, minutes, activeDays };
}

/** The card that fought back hardest: most lapses, then lowest stability. */
export function hardestWord(s: AppState, lang: Lang): Card | null {
  const pool = s.cards.filter((c) => c.lang === lang && c.fsrs.reps > 0);
  if (pool.length === 0) return null;
  return [...pool].sort(
    (a, b) => b.fsrs.lapses - a.fsrs.lapses || a.fsrs.stability - b.fsrs.stability
  )[0];
}

/** Projected date to reach a target's vocab count at the recent learning pace. */
export function paceForecast(
  s: AppState,
  lang: Lang,
  total: number
): { rate: number; daysLeft: number; date: string | null } {
  const mastered = masteredCount(s, lang);
  const remaining = Math.max(0, total - mastered);
  const window = logRange(s, 14);
  const learned = window.reduce((a, { stats }) => a + stats.newWords, 0);
  const activeDays = Math.max(1, window.length);
  const rate = learned / activeDays; // words/day proxy
  if (remaining === 0) return { rate, daysLeft: 0, date: todayStr() };
  if (rate < 0.05) return { rate, daysLeft: Infinity, date: null };
  const daysLeft = Math.ceil(remaining / rate);
  return { rate, daysLeft, date: todayStr(new Date(Date.now() + daysLeft * DAY_MS)) };
}

/** XP → level, plus progress within the level. */
export function levelFromXp(xp: number): { level: number; into: number; span: number } {
  // Level n requires ~100 * n^1.3 XP for the nth span; simple growth curve.
  let level = 1;
  let threshold = 0;
  let span = 100;
  while (xp >= threshold + span) {
    threshold += span;
    level += 1;
    span = Math.round(100 * Math.pow(level, 1.3));
  }
  return { level, into: xp - threshold, span };
}
