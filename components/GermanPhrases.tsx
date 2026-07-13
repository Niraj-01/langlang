"use client";

// German phrases viewer — category tabs, tap-to-hear, favorite toggle.
// Uses speakDe() instead of speakJa(). Mirrors Phrases.tsx structure.

import { useMemo, useState } from "react";
import { speakDe, canSpeak } from "@/lib/speak";
import { useMounted } from "@/lib/useMounted";
import { Icon } from "./Icon";
import { useApp, toggleFavorite } from "@/lib/store";

interface PhraseDE {
  german: string;
  english: string;
  category: string;
  pronunciation: string;
}

const CATS: { id: string; label: string }[] = [
  { id: "greetings", label: "Greetings" },
  { id: "politeness", label: "Politeness" },
  { id: "basics", label: "Basics" },
  { id: "self-intro", label: "Self-intro" },
  { id: "travel", label: "Travel & Food" },
  { id: "questions", label: "Questions" },
];

export function GermanPhrases({ data }: { data: PhraseDE[] }) {
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
          const fav = favorites.includes(`phrase-de:${p.german}`);
          return (
            <div
              key={p.german + p.english}
              className="tile-soft group flex w-full items-center gap-3 rounded-xl border border-line bg-surface p-4 text-left"
            >
              <button className="min-w-0 flex-1 text-left" onClick={() => speakDe(p.german)}>
                <div className="inline-flex items-center gap-1.5 text-xl font-bold leading-snug">
                  {p.german}
                  {speech && (
                    <Icon name="sound" size={15} className="text-muted transition group-hover:text-accent" />
                  )}
                </div>
                <div className="text-sm text-muted">{p.english}</div>
                <div className="mt-1 flex items-center gap-1.5 text-[11px] uppercase tracking-wide text-muted/70">
                  <Icon name="chat" size={12} /> {p.pronunciation}
                </div>
              </button>
              <button
                onClick={() => toggleFavorite(`phrase-de:${p.german}`)}
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
