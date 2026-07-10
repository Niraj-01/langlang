"use client";

import { useMemo, useState } from "react";
import type { Phrase } from "@/lib/types";
import { speakJa, canSpeak } from "@/lib/speak";
import { useMounted } from "@/lib/useMounted";
import { useApp, toggleFavorite } from "@/lib/store";

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
  const favorites = useApp().favorites;

  return (
    <div>
      <div className="rise mb-4 flex flex-wrap gap-1.5">
        {CATS.map((c) => (
          <button
            key={c.id}
            onClick={() => setCat(c.id)}
            className={`press rounded-full border px-3 py-1 text-xs font-medium transition ${
              cat === c.id
                ? "border-accent bg-accent/10 text-accent"
                : "border-line bg-surface text-muted hover:-translate-y-0.5 hover:text-ink"
            }`}
          >
            {c.label}
          </button>
        ))}
      </div>

      <div key={cat} className="stagger space-y-2">
        {list.map((p) => {
          const fav = favorites.includes(`phrase:${p.japanese}`);
          return (
            <div
              key={p.japanese + p.english}
              className="tile-soft group flex w-full items-center gap-3 rounded-xl border border-line bg-surface p-4 text-left"
            >
              <button className="min-w-0 flex-1 text-left" onClick={() => speakJa(p.japanese)}>
                <div className="jp text-xl leading-snug">
                  {p.japanese}{" "}
                  {speech && (
                    <span className="text-base text-muted transition group-hover:text-accent">
                      🔊
                    </span>
                  )}
                </div>
                <div className="romaji mt-0.5 text-sm">{p.romaji}</div>
                <div className="text-sm text-muted">{p.english}</div>
                <div className="mt-1 text-[11px] uppercase tracking-wide text-muted/70">
                  🗣 {p.pronunciation}
                </div>
              </button>
              <button
                onClick={() => toggleFavorite(`phrase:${p.japanese}`)}
                title={fav ? "Remove from saved" : "Save"}
                className={`press shrink-0 text-xl transition-colors ${
                  fav ? "text-accent" : "text-muted/50 hover:text-accent"
                }`}
              >
                {fav ? "♥" : "♡"}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
