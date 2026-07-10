"use client";

// Mistakes inbox — every wrong answer from lessons and failed feed reviews
// lands here. One tap starts a rehab lesson over the freshest eight.

import Link from "next/link";
import { useApp, clearMistake } from "@/lib/store";
import { useMounted } from "@/lib/useMounted";
import { speak as tts } from "@/lib/audio";
import { JaWord } from "@/components/Lex";

export function Mistakes() {
  const state = useApp();
  const mounted = useMounted();
  if (!mounted) return <div className="lang-ja min-h-dvh bg-bg" />;

  const lang = state.lang;
  const accent = lang === "ja" ? "lang-ja" : "lang-de";
  const list = state.mistakeLog.filter((m) => m.lang === lang);

  return (
    <div className={`${accent} min-h-dvh bg-bg pb-10`}>
      <div className="flex items-center justify-between border-b-2 border-line p-3">
        <Link href="/path" className="hud-chip">
          ← PATH
        </Link>
        <div className="font-display text-sm uppercase tracking-[0.3em] text-(--accent)">
          Mistakes
        </div>
        <div className="hud-chip opacity-60">{list.length}</div>
      </div>

      <div className="mx-auto max-w-md p-4">
        {list.length === 0 ? (
          <div className="rise flex flex-col items-center gap-4 py-16 text-center">
            <div className="text-6xl">🧘</div>
            <div className="opacity-60">
              No open wounds. Miss an answer anywhere — feed, lesson, quiz — and it
              shows up here for rehab.
            </div>
            <Link href="/lesson?mode=review" className="btn-ghost">
              PRACTICE WEAK WORDS INSTEAD
            </Link>
          </div>
        ) : (
          <>
            <div className="rise mb-4 text-sm opacity-60">
              Words that got you. Clear them the honest way — a rehab lesson — or
              swipe them off if they were typos.
            </div>
            <div className="stagger space-y-2">
              {list.map((m) => (
                <div
                  key={m.word}
                  className="flex items-center gap-3 border-2 border-line bg-panel p-3"
                >
                  <button
                    className="press min-w-0 flex-1 text-left"
                    onClick={() => tts(m.word, lang)}
                    title="Hear it"
                  >
                    {lang === "ja" ? (
                      <JaWord word={m.word} reading={m.reading} furigana={state.furigana} className="text-xl" />
                    ) : (
                      <span className="text-xl">{m.word}</span>
                    )}
                    <div className="truncate text-sm opacity-60">{m.meaning}</div>
                  </button>
                  <button
                    className="hud-chip opacity-60 hover:opacity-100"
                    title="Dismiss"
                    onClick={() => clearMistake(lang, m.word)}
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
            <Link href="/lesson?mode=mistakes" className="btn-primary rise mt-6 block w-full text-center">
              🩹 REHAB LESSON ({Math.min(8, list.length)} WORDS)
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
