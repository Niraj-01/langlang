"use client";

// Home — "Classic bento" (design 1a). Hero kana of the day, equal-weight
// tiles for each Learn surface, one red action per view. The scrolling
// Doomscroll now lives behind the ▶ Reels pill.

import { useState } from "react";
import Link from "next/link";
import { speakJa, canSpeak } from "@/lib/speak";
import { useMounted } from "@/lib/useMounted";

export interface DashKana {
  char: string;
  romaji: string;
}
export interface DashLoan {
  jp: string;
  romaji: string;
  en: string;
}
export interface DashKanji {
  kanji: string;
  meaning: string;
  strokes: number;
  onyomi: string[];
  kunyomi: string[];
  example?: { word: string; romaji: string; meaning: string };
}
export interface DashPhrase {
  japanese: string;
  romaji: string;
  english: string;
}

const LABEL = "text-[10px] font-bold uppercase tracking-[2px] text-muted";
const TILE =
  "rounded-2xl border border-line bg-surface transition-colors hover:border-accent/60";

export function Dashboard({
  hero,
  kana10,
  loans,
  kanji,
  phrases,
}: {
  hero: DashKana;
  kana10: DashKana[];
  loans: DashLoan[];
  kanji: DashKanji;
  phrases: DashPhrase[];
}) {
  const [flipped, setFlipped] = useState(false);
  const [pIdx, setPIdx] = useState(0);
  const speech = useMounted() && canSpeak();
  const phrase = phrases[pIdx % phrases.length];

  return (
    <div className="px-4 pb-4">
      {/* header + Reels pill */}
      <header className="flex items-center justify-between pb-5 pt-4">
        <div className="flex items-center gap-3.5">
          <span className="jp text-3xl font-bold text-accent">ホ</span>
          <div>
            <h1 className="text-xl font-bold tracking-tight">Home</h1>
            <p className="text-[13px] text-muted">
              Everything in one place. Pick up where you left off.
            </p>
          </div>
        </div>
        <Link
          href="/reels"
          className="flex shrink-0 items-center gap-1.5 rounded-full bg-accent px-4 py-2 text-[13px] font-semibold text-white transition hover:brightness-110"
        >
          ▶ Reels
        </Link>
      </header>

      <div className="grid auto-rows-min grid-cols-2 gap-3 md:auto-rows-[104px] md:grid-cols-4">
        {/* hero — kana of the day */}
        <button
          onClick={() => speakJa(hero.char)}
          className={`${TILE} col-span-2 flex items-center justify-between px-6 py-5 text-left md:row-span-2`}
        >
          <div>
            <div className={`${LABEL} mb-2.5`}>Kana of the day</div>
            <div className="romaji mb-3.5 text-base tracking-[2px]">{hero.romaji}</div>
            <span className="inline-flex items-center gap-2 rounded-full bg-accent px-4 py-2 text-[13px] font-semibold text-white">
              {speech ? "🔊 Hear it" : "Kana of the day"}
            </span>
          </div>
          <div className="jp text-[84px] font-medium leading-none md:text-[104px]">
            {hero.char}
          </div>
        </button>

        {/* hiragana chips */}
        <div className={`${TILE} col-span-2 p-4 md:row-span-2`}>
          <div className={`${LABEL} mb-3`}>Hiragana — tap to hear</div>
          <div className="grid grid-cols-5 gap-2">
            {kana10.map((k) => (
              <button
                key={k.char}
                onClick={() => speakJa(k.char)}
                className="rounded-[10px] border border-line py-1.5 text-center transition hover:border-accent hover:bg-surface2"
              >
                <div className="jp text-[22px] leading-tight">{k.char}</div>
                <div className="romaji text-[10px] tracking-[1px]">{k.romaji}</div>
              </button>
            ))}
          </div>
          <Link
            href="/hiragana"
            className="mt-3 inline-block text-[11px] text-muted hover:text-accent"
          >
            See all 46 →
          </Link>
        </div>

        {/* katakana loanwords */}
        <div className={`${TILE} col-span-2 p-4 md:row-span-2`}>
          <div className={`${LABEL} mb-3`}>Katakana — loanwords</div>
          <div className="flex flex-col gap-2.5">
            {loans.map((w) => (
              <button
                key={w.jp}
                onClick={() => speakJa(w.jp)}
                className="flex items-center justify-between rounded-[10px] bg-surface2 px-3.5 py-2.5 text-left transition hover:outline hover:outline-accent"
              >
                <span className="jp text-lg">
                  {w.jp} {speech && <span className="text-xs">🔊</span>}
                </span>
                <span className="text-xs text-muted">
                  <span className="romaji tracking-[1px]">{w.romaji}</span> · {w.en}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* kanji of the day — flip card */}
        <button
          onClick={() => setFlipped((f) => !f)}
          className="col-span-1 min-h-[190px] [perspective:900px] md:col-span-2 md:row-span-2 md:min-h-0"
          aria-label="Flip the kanji card"
        >
          <div
            className="relative h-full w-full transition-transform duration-[550ms] [transform-style:preserve-3d]"
            style={{ transform: flipped ? "rotateY(180deg)" : "rotateY(0deg)" }}
          >
            {/* front */}
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 rounded-2xl border border-line bg-surface [backface-visibility:hidden]">
              <div className={`${LABEL} absolute left-4 top-4`}>Kanji of the day</div>
              <div className="jp text-[64px] leading-none md:text-[72px]">{kanji.kanji}</div>
              <div className="text-[11px] text-muted">tap to flip</div>
            </div>
            {/* back */}
            <div className="absolute inset-0 flex flex-col justify-center gap-1.5 rounded-2xl border border-accent bg-surface2 px-5 py-4 text-left [backface-visibility:hidden] [transform:rotateY(180deg)]">
              <div className="text-[15px] font-bold md:text-[17px]">
                {kanji.meaning} <span className="jp text-accent">{kanji.kanji}</span> ·{" "}
                {kanji.strokes} strokes
              </div>
              {kanji.onyomi.length > 0 && (
                <div className="text-[13px] text-muted">
                  on&rsquo;yomi <span className="jp text-ink">{kanji.onyomi.join("、")}</span>
                </div>
              )}
              {kanji.kunyomi.length > 0 && (
                <div className="text-[13px] text-muted">
                  kun&rsquo;yomi <span className="jp text-ink">{kanji.kunyomi.join("、")}</span>
                </div>
              )}
              {kanji.example && (
                <div className="text-[13px] text-muted">
                  <span className="jp text-ink">{kanji.example.word}</span>{" "}
                  <span className="romaji tracking-[1px]">{kanji.example.romaji}</span> ·{" "}
                  {kanji.example.meaning}
                </div>
              )}
            </div>
          </div>
        </button>

        {/* phrase */}
        <div
          className={`${TILE} col-span-1 flex min-h-[190px] flex-col justify-between p-4 md:col-span-2 md:row-span-2 md:min-h-0 md:px-5`}
        >
          <div className={LABEL}>Phrase</div>
          <div>
            <div className="jp mb-1 text-xl md:text-2xl">{phrase.japanese}</div>
            <div className="romaji mb-0.5 text-[13px] tracking-[1px]">{phrase.romaji}</div>
            <div className="text-[13px] text-muted">{phrase.english}</div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => speakJa(phrase.japanese)}
              className="shrink-0 whitespace-nowrap rounded-full border border-line px-3.5 py-1.5 text-xs transition hover:border-accent hover:text-accent"
            >
              🔊 Listen
            </button>
            <button
              onClick={() => setPIdx((i) => (i + 1) % phrases.length)}
              className="shrink-0 whitespace-nowrap rounded-full border border-line px-3.5 py-1.5 text-xs transition hover:border-accent hover:text-accent"
            >
              Next →
            </button>
          </div>
        </div>

        {/* translate */}
        <Link
          href="/translate"
          className={`${TILE} col-span-2 p-4 md:col-span-3 md:row-span-2 md:px-5`}
        >
          <div className={`${LABEL} mb-3`}>Translate</div>
          <div className="flex items-center gap-3.5">
            <div className="flex-1 rounded-xl border border-line bg-surface2 px-4 py-3 text-sm text-muted">
              Where is the station?
            </div>
            <div className="text-lg text-accent">→</div>
            <div className="flex-[1.2]">
              <div className="jp text-lg md:text-xl">駅はどこですか</div>
              <div className="romaji text-xs tracking-[1px]">Eki wa doko desu ka</div>
            </div>
          </div>
          <div className="mt-3 text-[11px] text-muted">
            English ⇄ Japanese — always with romaji, never a guess.
          </div>
        </Link>

        {/* draw */}
        <Link
          href="/draw"
          className={`${TILE} col-span-2 flex flex-col p-4 md:col-span-1 md:row-span-2`}
        >
          <div className={`${LABEL} mb-2.5`}>Draw</div>
          <div
            className="flex min-h-[92px] flex-1 items-center justify-center rounded-[10px] bg-surface2"
            style={{
              backgroundImage:
                "linear-gradient(var(--color-line) 1px, transparent 1px), linear-gradient(90deg, var(--color-line) 1px, transparent 1px)",
              backgroundSize: "22px 22px",
            }}
          >
            <span className="jp text-[56px] text-ink/[0.14]">さ</span>
          </div>
          <div className="mt-2 text-[11px] text-muted">Trace with your finger</div>
        </Link>
      </div>
    </div>
  );
}
