"use client";

import { useMemo, useState } from "react";
import type { Phrase } from "@/lib/types";
import { speakJa, canSpeak } from "@/lib/speak";
import { useMounted } from "@/lib/useMounted";

const CATS: { id: string; label: string }[] = [
  { id: "greetings", label: "Greetings" },
  { id: "politeness", label: "Politeness" },
  { id: "basics", label: "Basics" },
  { id: "self-intro", label: "Self-intro" },
  { id: "travel", label: "Travel & Food" },
  { id: "questions", label: "Questions" },
];

export function Phrases({ data }: { data: Phrase[] }) {
  const [cat, setCat] = useState("greetings");
  const list = useMemo(() => data.filter((p) => p.category === cat), [data, cat]);
  const speech = useMounted() && canSpeak();

  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-1.5">
        {CATS.map((c) => (
          <button
            key={c.id}
            onClick={() => setCat(c.id)}
            className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
              cat === c.id
                ? "border-accent bg-accent/10 text-accent"
                : "border-line bg-surface text-muted hover:text-ink"
            }`}
          >
            {c.label}
          </button>
        ))}
      </div>

      <div className="space-y-2">
        {list.map((p) => (
          <button
            key={p.japanese + p.english}
            onClick={() => speakJa(p.japanese)}
            className="flex w-full items-center gap-3 rounded-xl border border-line bg-surface p-4 text-left transition hover:border-accent"
          >
            <div className="min-w-0 flex-1">
              <div className="jp text-xl leading-snug">{p.japanese}</div>
              <div className="romaji mt-0.5 text-sm">{p.romaji}</div>
              <div className="text-sm text-muted">{p.english}</div>
              <div className="mt-1 text-[11px] uppercase tracking-wide text-muted/70">
                🗣 {p.pronunciation}
              </div>
            </div>
            {speech && <span className="shrink-0 text-xl text-muted">🔊</span>}
          </button>
        ))}
      </div>
    </div>
  );
}
