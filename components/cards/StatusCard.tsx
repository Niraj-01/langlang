"use client";

// Mid-scroll status pulse: streak, today's numbers, what's still due.

import type { AppState } from "@/lib/types";
import { dueCards, levelFromXp } from "@/lib/store";
import { SEED_LABEL } from "@/lib/seed";

export function StatusCard({ state }: { state: AppState }) {
  const due = dueCards(state, state.lang).length;
  const { level, into, span } = levelFromXp(state.xp);
  const acc =
    state.today.reviews > 0
      ? Math.round((state.today.correct / state.today.reviews) * 100)
      : null;
  const flameSize =
    state.streak.current >= 100 ? "text-9xl" : state.streak.current >= 30 ? "text-8xl" : state.streak.current >= 7 ? "text-7xl" : "text-6xl";

  return (
    <div className="card-shell">
      <div className="card-panel items-center justify-center gap-6 text-center">
        <div className="tag self-stretch">STATUS CHECK</div>

        <div className={`${flameSize} ${state.streak.current > 0 ? "animate-flame" : "grayscale opacity-40"}`}>
          🔥
        </div>
        <div>
          <div className="font-display text-6xl text-(--accent)">
            {state.streak.current}
          </div>
          <div className="text-xs uppercase tracking-[0.3em] opacity-50">
            day streak · best {state.streak.longest}
          </div>
        </div>

        <div className="grid w-full grid-cols-3 gap-3">
          <Stat label="reviews today" value={state.today.reviews} />
          <Stat label="accuracy" value={acc === null ? "—" : `${acc}%`} />
          <Stat label="new words" value={state.today.newWords} />
        </div>

        <div className="w-full">
          <div className="mb-1 flex justify-between text-xs uppercase tracking-widest opacity-60">
            <span>LV {level}</span>
            <span>
              {into}/{span} XP
            </span>
          </div>
          <div className="h-3 w-full border-2 border-line bg-black/40">
            <div
              className="h-full bg-(--accent) transition-all"
              style={{ width: `${Math.min(100, (into / span) * 100)}%` }}
            />
          </div>
        </div>

        <div className="w-full space-y-1">
          <div className="text-left text-[10px] uppercase tracking-[0.3em] opacity-40">
            today&apos;s quests
          </div>
          {state.quests.map((q) => (
            <div key={q.key} className="flex items-center gap-2">
              <div className="h-2 flex-1 border-2 border-line bg-black/40">
                <div
                  className={`h-full ${q.done ? "bg-good" : "bg-(--accent)"}`}
                  style={{ width: `${(q.progress / q.target) * 100}%` }}
                />
              </div>
              <span className="w-24 shrink-0 text-left text-[10px] uppercase tracking-wider opacity-60">
                {q.done ? "✓ done" : q.label}
              </span>
            </div>
          ))}
        </div>

        <div className="text-sm uppercase tracking-[0.2em] opacity-60">
          {due > 0
            ? `${due} review${due === 1 ? "" : "s"} still due — keep scrolling ↑`
            : `queue clear · ${SEED_LABEL[state.lang]} grinding ↑`}
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="border-2 border-line bg-black/30 p-3">
      <div className="font-display text-3xl">{value}</div>
      <div className="mt-1 text-[10px] uppercase tracking-widest opacity-50">
        {label}
      </div>
    </div>
  );
}
