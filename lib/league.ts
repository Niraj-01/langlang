// Weekly league — a Duolingo-style tier ladder driven by real weekly XP.
// Local-first and honest: with no backend it shows your live tier and the
// climb to the next one (no fabricated rivals). If a Supabase `leaderboard`
// view exists (see supabase/migrations), fetchLeaderboard() returns real
// people; otherwise the UI stays solo. The review path never blocks on this.

import type { AppState } from "./types";
import { weeklyStats } from "./store";
import { supabase } from "./supabase";

export interface Tier {
  name: string;
  emoji: string;
  min: number; // weekly XP at or above this puts you in the tier
}

// Ascending cutoffs — the last tier you qualify for is your current league.
export const TIERS: Tier[] = [
  { name: "Bronze", emoji: "🥉", min: 0 },
  { name: "Silver", emoji: "🥈", min: 100 },
  { name: "Gold", emoji: "🥇", min: 300 },
  { name: "Sapphire", emoji: "💠", min: 600 },
  { name: "Ruby", emoji: "❤️‍🔥", min: 1000 },
  { name: "Diamond", emoji: "💎", min: 1800 },
];

export function weekXp(s: AppState): number {
  return weeklyStats(s).xp;
}

export interface Standing {
  index: number;
  tier: Tier;
  next: Tier | null;
  xp: number;
  toNext: number; // XP still needed to promote (0 at top tier)
  progress: number; // 0..1 toward next tier
}

export function standing(s: AppState): Standing {
  const xp = weekXp(s);
  let index = 0;
  for (let i = 0; i < TIERS.length; i++) if (xp >= TIERS[i].min) index = i;
  const tier = TIERS[index];
  const next = TIERS[index + 1] ?? null;
  const toNext = next ? Math.max(0, next.min - xp) : 0;
  const span = next ? next.min - tier.min : 1;
  const progress = next ? Math.min(1, (xp - tier.min) / span) : 1;
  return { index, tier, next, xp, toNext, progress };
}

export interface LeagueRow {
  name: string;
  xp: number;
}

// Real cross-user standings — only when a `leaderboard` view is provisioned.
// Returns null (not an error) whenever the backend isn't reachable/configured,
// so the caller falls back to the solo ladder.
export async function fetchLeaderboard(): Promise<LeagueRow[] | null> {
  const sb = supabase();
  if (!sb) return null;
  try {
    const { data, error } = await sb
      .from("leaderboard")
      .select("name, weekly_xp")
      .order("weekly_xp", { ascending: false })
      .limit(30);
    if (error || !data) return null;
    return data.map((r: { name: string | null; weekly_xp: number | null }) => ({
      name: r.name ?? "Learner",
      xp: r.weekly_xp ?? 0,
    }));
  } catch {
    return null;
  }
}
