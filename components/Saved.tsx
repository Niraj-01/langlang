"use client";

// Saved — everything the user hearted: kanji, phrases, and deck words.

import Link from "next/link";
import kanjiData from "@/data/kanji.json";
import phrasesData from "@/data/phrases.json";
import type { Kanji, Phrase } from "@/lib/types";
import { useApp, toggleFavorite } from "@/lib/store";
import { Icon } from "./Icon";
import { useMounted } from "@/lib/useMounted";
import { speakJa } from "@/lib/speak";

const KANJI = kanjiData as Kanji[];
const PHRASES = phrasesData as Phrase[];

export function Saved() {
  const state = useApp();
  const mounted = useMounted();
  if (!mounted) return <div className="min-h-[50dvh]" />;

  const kanji = state.favorites
    .filter((f) => f.startsWith("kanji:"))
    .map((f) => KANJI.find((k) => k.kanji === f.slice(6)))
    .filter((k): k is Kanji => !!k);
  const phrases = state.favorites
    .filter((f) => f.startsWith("phrase:"))
    .map((f) => PHRASES.find((p) => p.japanese === f.slice(7)))
    .filter((p): p is Phrase => !!p);

  if (kanji.length === 0 && phrases.length === 0) {
    return (
      <div className="rise flex flex-col items-center gap-4 px-4 py-16 text-center">
        <Icon name="heartOff" size={52} className="text-muted" />
        <p className="max-w-xs text-sm text-muted">
          Nothing saved yet. Tap the heart on any kanji or phrase and it&apos;ll wait
          for you here.
        </p>
        <div className="flex gap-2">
          <Link href="/kanji" className="press rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white">
            Browse kanji
          </Link>
          <Link href="/phrases" className="press rounded-lg border border-line px-4 py-2 text-sm text-muted hover:border-accent">
            Browse phrases
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 pb-6">
      {kanji.length > 0 && (
        <>
          <div className="rise mb-2 text-[10px] font-bold uppercase tracking-[2px] text-muted">
            Kanji · {kanji.length}
          </div>
          <div className="stagger grid grid-cols-3 gap-2 sm:grid-cols-5">
            {kanji.map((k) => (
              <div
                key={k.kanji}
                className="tile-soft relative flex flex-col items-center rounded-xl border border-line bg-surface py-3"
              >
                <button onClick={() => speakJa(k.kanji)} className="jp text-3xl leading-none">
                  {k.kanji}
                </button>
                <span className="mt-1.5 line-clamp-1 px-1 text-[10px] text-muted">
                  {k.meaning.split(",")[0]}
                </span>
                <button
                  onClick={() => toggleFavorite(`kanji:${k.kanji}`)}
                  className="press absolute right-1.5 top-1 text-xs text-accent"
                  title="Remove"
                >
                  ♥
                </button>
              </div>
            ))}
          </div>
        </>
      )}

      {phrases.length > 0 && (
        <>
          <div className="rise mb-2 mt-6 text-[10px] font-bold uppercase tracking-[2px] text-muted">
            Phrases · {phrases.length}
          </div>
          <div className="stagger space-y-2">
            {phrases.map((p) => (
              <div
                key={p.japanese}
                className="tile-soft flex items-center gap-3 rounded-xl border border-line bg-surface p-4"
              >
                <button className="min-w-0 flex-1 text-left" onClick={() => speakJa(p.japanese)}>
                  <div className="jp text-lg leading-snug">{p.japanese}</div>
                  <div className="romaji text-sm">{p.romaji}</div>
                  <div className="text-sm text-muted">{p.english}</div>
                </button>
                <button
                  onClick={() => toggleFavorite(`phrase:${p.japanese}`)}
                  className="press shrink-0 text-xl text-accent"
                  title="Remove"
                >
                  ♥
                </button>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
