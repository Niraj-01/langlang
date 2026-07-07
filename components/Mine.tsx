"use client";

// Sentence Mining Inbox — the immersion bridge. Paste a line from anime subs,
// a German TikTok, an article; Claude glosses it; one tap sends the sentence
// and its unknown words to your FSRS deck.

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import type { MineBreakdown } from "@/app/api/mine/route";
import { useApp, addMinedCards, cardIdFor } from "@/lib/store";
import { speak as tts, sfxAdd } from "@/lib/audio";
import { burst } from "@/lib/confetti";

const SAMPLES = {
  ja: "昨日、友だちと新しいラーメン屋に行きました。",
  de: "Gestern habe ich mit Freunden einen neuen Film gesehen.",
};

export function Mine() {
  const state = useApp();
  const lang = state.lang;
  const accent = lang === "ja" ? "lang-ja" : "lang-de";

  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<MineBreakdown | null>(null);
  const [source, setSource] = useState("");
  const [chosen, setChosen] = useState<Set<string>>(new Set());
  const [added, setAdded] = useState(false);

  const owned = (word: string) => state.cards.some((c) => c.id === cardIdFor(lang, word));

  const analyze = async () => {
    if (!text.trim() || busy) return;
    setBusy(true);
    setError(null);
    setData(null);
    setAdded(false);
    try {
      const res = await fetch("/api/mine", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ lang, sentence: text.trim() }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(
          json.error === "no_api_key"
            ? "Mining needs a Claude API key — add ANTHROPIC_API_KEY to .env.local."
            : "Couldn't break that sentence down — try again."
        );
        return;
      }
      setData(json);
      setSource(text.trim());
      // pre-select words you don't already have
      setChosen(new Set(json.words.filter((w: { word: string }) => !owned(w.word)).map((w: { word: string }) => w.word)));
    } catch {
      setError("Network error — check your connection.");
    } finally {
      setBusy(false);
    }
  };

  const toggle = (word: string) => {
    const next = new Set(chosen);
    if (next.has(word)) next.delete(word);
    else next.add(word);
    setChosen(next);
  };

  const addAll = () => {
    if (!data) return;
    const words = data.words.filter((w) => chosen.has(w.word));
    const n = addMinedCards(
      lang,
      { text: source, reading: data.reading, meaning: data.translation },
      words
    );
    setAdded(true);
    if (n > 0) {
      sfxAdd();
      burst(innerWidth / 2, innerHeight / 2);
    }
  };

  return (
    <div className={`${accent} min-h-dvh bg-bg pb-10`}>
      <div className="flex items-center justify-between border-b-2 border-line p-3">
        <Link href="/" className="hud-chip">
          ← FEED
        </Link>
        <div className="font-display text-sm uppercase tracking-[0.3em] text-(--accent)">
          Mining Inbox
        </div>
        <div className="hud-chip opacity-60">{lang === "ja" ? "日本語" : "DEUTSCH"}</div>
      </div>

      <div className="p-4">
        <div className="mb-2 text-sm opacity-60">
          Paste a sentence from anything you&apos;re watching or reading. Get furigana,
          glosses, and grammar — then mine the words you don&apos;t know.
        </div>
        <textarea
          className={`h-28 w-full border-4 border-line bg-black/30 p-3 text-lg outline-none focus:border-(--accent) ${lang === "ja" ? "font-jp" : ""}`}
          placeholder={`e.g. ${SAMPLES[lang]}`}
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <div className="mt-2 flex gap-2">
          <button className="btn-primary flex-1" onClick={analyze} disabled={busy || !text.trim()}>
            {busy ? "breaking it down…" : "⛏ MINE IT"}
          </button>
          <button className="btn-ghost" onClick={() => setText(SAMPLES[lang])}>
            SAMPLE
          </button>
        </div>
        {error && <div className="mt-3 border-2 border-bad p-3 text-sm text-bad">{error}</div>}
      </div>

      {data && (
        <div className="px-4">
          <button
            className="mb-3 w-full border-l-4 border-(--accent) bg-panel p-3 text-left"
            onClick={() => tts(source, lang)}
          >
            <div className={`text-xl ${lang === "ja" ? "font-jp" : ""}`}>{source}</div>
            {lang === "ja" && data.reading && (
              <div className="font-jp mt-1 text-sm opacity-50">{data.reading}</div>
            )}
            <div className="mt-1 text-sm italic opacity-70">{data.translation}</div>
            <div className="mt-1 text-[10px] uppercase tracking-widest opacity-40">▶ tap to hear</div>
          </button>

          <div className="mb-1 text-[10px] uppercase tracking-[0.3em] opacity-40">words</div>
          <div className="space-y-2">
            {data.words.map((w) => {
              const have = owned(w.word);
              const on = chosen.has(w.word);
              return (
                <button
                  key={w.word}
                  onClick={() => !have && toggle(w.word)}
                  className={`flex w-full items-center justify-between border-2 p-3 text-left ${
                    have
                      ? "border-line opacity-40"
                      : on
                        ? "border-(--accent)"
                        : "border-line bg-panel"
                  }`}
                >
                  <div>
                    <span className={`text-lg ${lang === "ja" ? "font-jp" : ""}`}>{w.word}</span>
                    {lang === "ja" && w.reading && (
                      <span className="font-jp ml-2 text-xs opacity-50">{w.reading}</span>
                    )}
                    <div className="text-sm opacity-60">
                      {w.meaning} <span className="opacity-40">· {w.pos}</span>
                    </div>
                  </div>
                  <span className="text-xs uppercase tracking-widest">
                    {have ? "known" : on ? "✓ mine" : "＋"}
                  </span>
                </button>
              );
            })}
          </div>

          {data.grammar.length > 0 && (
            <>
              <div className="mb-1 mt-4 text-[10px] uppercase tracking-[0.3em] opacity-40">
                grammar
              </div>
              <div className="space-y-2">
                {data.grammar.map((g, i) => (
                  <div key={i} className="border-2 border-line bg-panel p-3">
                    <div className="font-display text-sm text-(--accent)">{g.point}</div>
                    <div className="text-sm opacity-70">{g.note}</div>
                  </div>
                ))}
              </div>
            </>
          )}

          {added ? (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-4 border-2 border-good p-3 text-center text-good"
            >
              ✓ Mined into your deck — see you in the feed.
            </motion.div>
          ) : (
            <button
              className="btn-primary mt-4 w-full"
              onClick={addAll}
              disabled={chosen.size === 0}
            >
              ＋ ADD SENTENCE + {chosen.size} WORD{chosen.size === 1 ? "" : "S"} TO DECK
            </button>
          )}
        </div>
      )}
    </div>
  );
}
