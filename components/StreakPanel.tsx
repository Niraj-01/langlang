"use client";

// Duolingo-style streak widget: big flame, last-7-days strip, freeze count,
// and a progress bar to the next milestone. Pure display — streak logic
// lives in the store (touchStreak).

import type { AppState } from "@/lib/types";
import { nextMilestone, streakWeek, STREAK_MILESTONES } from "@/lib/path";
import { Icon } from "./Icon";

export function StreakPanel({ state }: { state: AppState }) {
  const s = state.streak;
  const week = streakWeek(state);
  const next = nextMilestone(s.current);
  const prev = [...STREAK_MILESTONES].reverse().find((m) => m <= s.current) ?? 0;
  const pct = Math.min(100, ((s.current - prev) / (next - prev)) * 100);
  const alive = s.current > 0;

  return (
    <div className="border-4 border-line bg-panel p-4" style={{ boxShadow: "6px 6px 0 rgba(0,0,0,.55)" }}>
      <div className="flex items-center gap-4">
        <Icon name="flame" size={56} className={alive ? "animate-flame text-(--accent)" : "opacity-30"} />
        <div className="flex-1">
          <div className="font-display text-4xl leading-none">
            {s.current}
            <span className="ml-2 text-sm uppercase tracking-widest opacity-50">
              day streak
            </span>
          </div>
          <div className="mt-1 text-[11px] uppercase tracking-widest opacity-50">
            longest {s.longest} · {s.freezes} freeze{s.freezes === 1 ? "" : "s"} banked
          </div>
        </div>
      </div>

      {/* last 7 days */}
      <div className="mt-4 grid grid-cols-7 gap-1.5">
        {week.map((d, i) => (
          <div key={d.date} className="flex flex-col items-center gap-1">
            <div
              className={`flex h-9 w-full items-center justify-center border-2 text-base ${
                d.active
                  ? "border-(--accent) bg-(--accent)/15"
                  : "border-line bg-black/30 opacity-40"
              }`}
              title={d.date}
            >
              {d.active ? <Icon name="flame" size={16} className="text-(--accent)" /> : i === 6 ? "·" : "—"}
            </div>
            <div className={`text-[9px] uppercase ${i === 6 ? "text-(--accent)" : "opacity-40"}`}>
              {i === 6 ? "today" : d.label}
            </div>
          </div>
        ))}
      </div>

      {/* next milestone */}
      <div className="mt-4">
        <div className="mb-1 flex justify-between text-[10px] uppercase tracking-widest opacity-50">
          <span>next milestone</span>
          <span>
            {s.current}/{next} days
          </span>
        </div>
        <div className="h-2 w-full border-2 border-line bg-black/40">
          <div className="bar-anim h-full bg-(--accent)" style={{ width: `${pct}%` }} />
        </div>
        <div className="mt-1 text-[10px] uppercase tracking-widest opacity-40">
          {next - s.current} day{next - s.current === 1 ? "" : "s"} to the {next}-day flame
          {s.freezes === 0 && " · beat a boss to bank a streak freeze"}
        </div>
      </div>
    </div>
  );
}
