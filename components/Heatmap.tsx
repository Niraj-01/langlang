"use client";

// Contribution-style activity heatmap (last 12 weeks) built from state.log.
// Each cell is a day; intensity scales with that day's XP. Reads the log
// directly (not logRange) so empty days still render as grid cells.

import type { AppState, DayStats } from "@/lib/types";

const WEEKS = 12;
const DAY_MS = 86400000;

function dayKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

function level(xp: number): number {
  if (xp <= 0) return 0;
  if (xp < 20) return 1;
  if (xp < 50) return 2;
  if (xp < 120) return 3;
  return 4;
}

export function Heatmap({ state }: { state: AppState }) {
  const today = new Date();
  // start on the Sunday WEEKS-1 weeks back so columns align to weeks
  const start = new Date(today.getTime() - (WEEKS - 1) * 7 * DAY_MS);
  start.setDate(start.getDate() - start.getDay()); // back up to Sunday

  const statFor = (key: string): DayStats | undefined =>
    key === state.today.date ? state.today : state.log[key];

  const columns: { key: string; xp: number; future: boolean }[][] = [];
  let total = 0;
  let activeDays = 0;
  for (let w = 0; w < WEEKS; w++) {
    const col: { key: string; xp: number; future: boolean }[] = [];
    for (let d = 0; d < 7; d++) {
      const date = new Date(start.getTime() + (w * 7 + d) * DAY_MS);
      const key = dayKey(date);
      const xp = statFor(key)?.xp ?? 0;
      const future = date.getTime() > today.getTime();
      if (!future && xp > 0) {
        total += xp;
        activeDays++;
      }
      col.push({ key, xp, future });
    }
    columns.push(col);
  }

  const shade = (lvl: number) =>
    ["rgba(255,255,255,0.06)", "var(--accent)", "var(--accent)", "var(--accent)", "var(--accent)"][lvl];
  const opacity = (lvl: number) => [1, 0.35, 0.6, 0.8, 1][lvl];

  return (
    <div>
      <div className="flex gap-[3px] overflow-x-auto pb-1">
        {columns.map((col, ci) => (
          <div key={ci} className="flex flex-col gap-[3px]">
            {col.map((cell) => {
              const lvl = level(cell.xp);
              return (
                <div
                  key={cell.key}
                  title={cell.future ? "" : `${cell.key}: ${cell.xp} XP`}
                  className="h-3 w-3 rounded-[2px]"
                  style={{
                    background: cell.future ? "transparent" : shade(lvl),
                    opacity: cell.future ? 0 : opacity(lvl),
                  }}
                />
              );
            })}
          </div>
        ))}
      </div>
      <div className="mt-2 flex items-center justify-between text-[10px] uppercase tracking-widest opacity-40">
        <span>{activeDays} active days · {total} XP · 12 weeks</span>
        <span className="flex items-center gap-1">
          less
          {[0, 1, 2, 3, 4].map((l) => (
            <span
              key={l}
              className="h-2.5 w-2.5 rounded-[2px]"
              style={{ background: shade(l), opacity: opacity(l) }}
            />
          ))}
          more
        </span>
      </div>
    </div>
  );
}
