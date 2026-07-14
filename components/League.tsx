"use client";

// Weekly League — your live tier from this week's XP, and the climb to the
// next one. If a real leaderboard is provisioned it shows people; otherwise
// it's an honest solo ladder (no fake rivals).

import { useEffect, useState } from "react";
import Link from "next/link";
import { useApp, setDisplayName, setShareLeaderboard } from "@/lib/store";
import { TIERS, standing, weekXp, fetchLeaderboard, type LeagueRow } from "@/lib/league";
import { Icon } from "./Icon";

export function League() {
  const state = useApp();
  const accent = state.lang === "ja" ? "lang-ja" : "lang-de";
  const s = standing(state);
  const myXp = weekXp(state);

  const [rows, setRows] = useState<LeagueRow[] | null>(null);
  useEffect(() => {
    let alive = true;
    fetchLeaderboard().then((r) => alive && setRows(r));
    return () => {
      alive = false;
    };
  }, []);

  return (
    <div className={`${accent} min-h-dvh bg-bg pb-10`}>
      <div className="flex items-center justify-between border-b-2 border-line p-3">
        <Link href="/reels" className="hud-chip gap-1">
          <Icon name="arrowLeft" size={14} /> FEED
        </Link>
        <div className="font-display text-sm uppercase tracking-[0.3em] text-(--accent)">
          Weekly League
        </div>
        <Link href="/profile" className="hud-chip" aria-label="Profile">
          <Icon name="user" size={14} />
        </Link>
      </div>

      {/* current tier */}
      <div className="rise p-4">
        <div className="border-2 border-(--accent) bg-panel p-5 text-center">
          <Icon name={s.tier.icon} size={64} className="mx-auto" style={{ color: s.tier.color }} />
          <div className="mt-2 font-display text-2xl uppercase tracking-widest text-(--accent)">
            {s.tier.name} League
          </div>
          <div className="mt-1 text-sm opacity-70">{myXp} XP this week</div>

          {s.next ? (
            <div className="mt-4">
              <div className="mb-1 flex justify-between text-xs uppercase tracking-widest opacity-60">
                <span>{s.tier.name}</span>
                <span className="inline-flex items-center gap-1">
                  {s.toNext} XP to {s.next.name}
                  <Icon name={s.next.icon} size={13} style={{ color: s.next.color }} />
                </span>
              </div>
              <div className="h-3 w-full border-2 border-line bg-black/40">
                <div className="bar-anim h-full bg-(--accent)" style={{ width: `${s.progress * 100}%` }} />
              </div>
            </div>
          ) : (
            <div className="mt-4 flex items-center justify-center gap-2 text-sm text-good">
              <Icon name="trophy" size={16} /> Top tier reached — you&apos;re Diamond.
            </div>
          )}
        </div>
      </div>

      {/* the ladder */}
      <div className="rise px-4" style={{ "--rise-delay": "0.1s" } as React.CSSProperties}>
        <div className="mb-2 font-display text-xs uppercase tracking-[0.3em] opacity-60">
          Tiers
        </div>
        <div className="space-y-2">
          {[...TIERS].reverse().map((t) => {
            const here = t.name === s.tier.name;
            return (
              <div
                key={t.name}
                className={`flex items-center gap-3 border-2 p-3 ${
                  here ? "border-(--accent) bg-panel" : "border-line bg-black/20 opacity-70"
                }`}
              >
                <Icon name={t.icon} size={22} style={{ color: t.color }} />
                <span className="font-display uppercase tracking-widest">{t.name}</span>
                <span className="ml-auto text-xs opacity-60">{t.min}+ XP / week</span>
                {here && <span className="text-xs font-bold text-(--accent)">YOU</span>}
              </div>
            );
          })}
        </div>
      </div>

      {/* real leaderboard when provisioned, else honest solo note */}
      <div className="rise px-4 pt-6" style={{ "--rise-delay": "0.16s" } as React.CSSProperties}>
        <div className="mb-2 font-display text-xs uppercase tracking-[0.3em] opacity-60">
          Standings
        </div>
        {rows && rows.length > 0 ? (
          <div className="divide-y divide-line border-2 border-line bg-panel">
            {rows.map((r, i) => (
              <div key={i} className="flex items-center gap-3 p-3">
                <span className="w-6 text-center font-display opacity-60">{i + 1}</span>
                <span className="truncate">{r.name}</span>
                <span className="ml-auto font-display text-(--accent)">{r.xp} XP</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="border-2 border-dashed border-line bg-black/20 p-4 text-center text-sm opacity-70">
            <Icon name="user" size={26} className="mx-auto" />
            <div className="mt-2">
              It&apos;s just you here for now. When friends join and sync, the weekly leaderboard fills in
              automatically.
            </div>
          </div>
        )}
      </div>

      {/* opt-in — nobody is listed without explicitly choosing to be */}
      <div className="rise px-4 pt-6" style={{ "--rise-delay": "0.22s" } as React.CSSProperties}>
        <div className="mb-2 font-display text-xs uppercase tracking-[0.3em] opacity-60">
          Appear on the board
        </div>
        <div className="border-2 border-line bg-panel p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="text-sm opacity-70">
              Share a display name and this week&apos;s XP with other signed-in learners. Off by
              default — nothing leaves your device until you turn this on.
            </div>
            <button
              onClick={() => setShareLeaderboard(!state.shareLeaderboard)}
              aria-pressed={!!state.shareLeaderboard}
              aria-label="Share my score on the leaderboard"
              className={`relative h-8 w-14 shrink-0 border-2 border-line ${
                state.shareLeaderboard ? "bg-(--accent)" : "bg-black/40"
              }`}
            >
              <span
                className={`absolute top-0.5 h-6 w-6 bg-black transition-all ${
                  state.shareLeaderboard ? "left-7" : "left-0.5"
                }`}
              />
            </button>
          </div>
          {state.shareLeaderboard && (
            <input
              value={state.displayName ?? ""}
              onChange={(e) => setDisplayName(e.target.value)}
              maxLength={24}
              placeholder="Display name (shown to others)"
              className="mt-3 w-full border-2 border-line bg-black/30 px-3 py-2 text-sm outline-none focus:border-(--accent)"
            />
          )}
        </div>
      </div>
    </div>
  );
}
