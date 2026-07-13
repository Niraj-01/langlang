"use client";

// German Home — bento-grid dashboard mirroring the Japanese Dashboard.tsx.
// Word of the day, article drill, vocab preview, phrase, translate link, grammar link.

import { useState } from "react";
import Link from "next/link";
import { speakDe, canSpeak } from "@/lib/speak";
import { useMounted } from "@/lib/useMounted";
import { Icon } from "./Icon";
import { ARTICLE_COLOR } from "./Lex";

export interface DashDeWord {
  word: string;
  article?: "der" | "die" | "das";
  plural?: string;
  meaning: string;
  pos: string;
  example?: string;
  exampleMeaning?: string;
  tip?: string;
}

export interface DashDePhrase {
  german: string;
  english: string;
}

const LABEL = "text-[10px] font-bold uppercase tracking-[2px] text-muted";
const TILE = "tile-soft rounded-2xl border border-line bg-surface";

export function GermanDashboard({
  hero,
  nouns10,
  phrases,
}: {
  hero: DashDeWord;
  nouns10: DashDeWord[];
  phrases: DashDePhrase[];
}) {
  const [flipped, setFlipped] = useState(false);
  const [pIdx, setPIdx] = useState(0);
  const speech = useMounted() && canSpeak();
  const phrase = phrases[pIdx % phrases.length];

  return (
    <div className="px-4 pb-4">
      {/* header + Reels pill */}
      <header className="rise flex items-center justify-between pb-5 pt-4">
        <div className="flex items-center gap-3.5">
          <span className="text-3xl font-bold text-accent" style={{ fontFamily: "var(--font-display)" }}>DE</span>
          <div>
            <h1 className="text-xl font-bold tracking-tight">Deutsch</h1>
            <p className="text-[13px] text-muted">
              Your German reference. Pick up where you left off.
            </p>
          </div>
        </div>
        <Link
          href="/reels"
          className="press flex shrink-0 items-center gap-1.5 rounded-full bg-accent px-4 py-2 text-[13px] font-semibold text-white shadow-[0_4px_16px_-4px] shadow-accent/50 transition hover:brightness-110"
        >
          ▶ Reels
        </Link>
      </header>

      <div className="stagger grid auto-rows-min grid-cols-2 gap-3 md:auto-rows-[104px] md:grid-cols-4">
        {/* hero — word of the day */}
        <button
          onClick={() => speakDe(hero.word)}
          className={`${TILE} col-span-2 flex items-center justify-between px-6 py-5 text-left md:row-span-2`}
        >
          <div>
            <div className={`${LABEL} mb-2.5`}>Word of the day</div>
            <div className="mb-1 text-sm text-muted">{hero.meaning}</div>
            <span className="inline-flex items-center gap-2 rounded-full bg-accent px-4 py-2 text-[13px] font-semibold text-white">
              {speech ? <><Icon name="sound" size={14} /> Hear it</> : "Word of the day"}
            </span>
          </div>
          <div className="text-right">
            <div
              className="glyph-float text-[56px] font-bold leading-none md:text-[72px]"
              style={{ "--gf-t": "9s" } as React.CSSProperties}
            >
              {hero.article ? (
                <>
                  <span className={`text-[32px] md:text-[42px] ${ARTICLE_COLOR[hero.article]}`}>
                    {hero.article}
                  </span>{" "}
                  {hero.word}
                </>
              ) : (
                hero.word
              )}
            </div>
            {hero.pos === "noun" && hero.plural && (
              <div className="mt-1 text-xs text-muted">
                pl. <span className="text-die">die</span> {hero.plural}
              </div>
            )}
          </div>
        </button>

        {/* nouns with articles */}
        <div className={`${TILE} col-span-2 p-4 md:row-span-2`}>
          <div className={`${LABEL} mb-3`}>Nouns — tap to hear</div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
            {nouns10.map((n) => (
              <button
                key={n.word}
                onClick={() => speakDe(`${n.article} ${n.word}`)}
                className="press rounded-[10px] border border-line py-2 text-center transition hover:-translate-y-0.5 hover:border-accent hover:bg-surface2"
              >
                <div className="text-[10px]">
                  {n.article && <span className={ARTICLE_COLOR[n.article]}>{n.article}</span>}
                </div>
                <div className="text-base font-bold leading-tight">{n.word}</div>
                <div className="text-[10px] text-muted">{n.meaning}</div>
              </button>
            ))}
          </div>
          <Link
            href="/vocab-de"
            className="group mt-3 inline-block text-[11px] text-muted hover:text-accent"
          >
            See all vocab <span className="inline-block transition-transform group-hover:translate-x-1">→</span>
          </Link>
        </div>

        {/* word of the day — flip card */}
        <button
          onClick={() => setFlipped((f) => !f)}
          className="col-span-1 min-h-[190px] [perspective:900px] md:col-span-2 md:row-span-2 md:min-h-0"
          aria-label="Flip the word card"
        >
          <div
            className="relative h-full w-full transition-transform duration-[550ms] [transform-style:preserve-3d]"
            style={{ transform: flipped ? "rotateY(180deg)" : "rotateY(0deg)" }}
          >
            {/* front */}
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 rounded-2xl border border-line bg-surface [backface-visibility:hidden]">
              <div className={`${LABEL} absolute left-4 top-4`}>Article quiz</div>
              <div className="text-[40px] font-bold leading-none md:text-[52px]">{hero.word}</div>
              <div className="text-sm text-muted">{hero.meaning}</div>
              <div className="mt-2 flex gap-2">
                {(["der", "die", "das"] as const).map((a) => (
                  <span
                    key={a}
                    className={`rounded-lg border px-3 py-1 text-sm font-bold ${
                      a === hero.article
                        ? ""
                        : "border-line text-muted"
                    }`}
                  >
                    {a}
                  </span>
                ))}
              </div>
              <div className="mt-1 text-[11px] text-muted">tap to flip</div>
            </div>
            {/* back */}
            <div className="absolute inset-0 flex flex-col justify-center gap-1.5 rounded-2xl border border-accent bg-surface2 px-5 py-4 text-left [backface-visibility:hidden] [transform:rotateY(180deg)]">
              <div className="text-[15px] font-bold md:text-[17px]">
                {hero.article && (
                  <span className={ARTICLE_COLOR[hero.article]}>{hero.article}</span>
                )}{" "}
                {hero.word} — {hero.meaning}
              </div>
              {hero.pos === "noun" && hero.plural && (
                <div className="text-[13px] text-muted">
                  plural: <span className="text-die">die</span> {hero.plural}
                </div>
              )}
              {hero.example && (
                <div className="text-[13px] text-muted">
                  {hero.example}
                </div>
              )}
              {hero.exampleMeaning && (
                <div className="text-[13px] text-muted italic">{hero.exampleMeaning}</div>
              )}
              {hero.tip && (
                <div className="text-[12px] text-muted/80">
                  <Icon name="bulb" size={11} className="mr-0.5 inline text-accent" />
                  {hero.tip}
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
            <div className="mb-1 text-xl font-bold md:text-2xl">{phrase.german}</div>
            <div className="text-[13px] text-muted">{phrase.english}</div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => speakDe(phrase.german)}
              className="press inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border border-line px-3.5 py-1.5 text-xs transition hover:border-accent hover:text-accent"
            >
              <Icon name="sound" size={13} /> Listen
            </button>
            <button
              onClick={() => setPIdx((i) => (i + 1) % phrases.length)}
              className="press shrink-0 whitespace-nowrap rounded-full border border-line px-3.5 py-1.5 text-xs transition hover:border-accent hover:text-accent"
            >
              Next →
            </button>
          </div>
        </div>

        {/* translate */}
        <Link
          href="/translate-de"
          className={`${TILE} col-span-2 p-4 md:col-span-3 md:row-span-2 md:px-5`}
        >
          <div className={`${LABEL} mb-3`}>Translate</div>
          <div className="flex items-center gap-3.5">
            <div className="flex-1 rounded-xl border border-line bg-surface2 px-4 py-3 text-sm text-muted">
              Where is the station?
            </div>
            <div className="text-lg text-accent">→</div>
            <div className="flex-[1.2]">
              <div className="text-lg font-bold md:text-xl">Wo ist der Bahnhof?</div>
            </div>
          </div>
          <div className="mt-3 text-[11px] text-muted">
            English ⇄ German — always with pronunciation.
          </div>
        </Link>

        {/* grammar + articles */}
        <div className="col-span-2 grid grid-cols-2 gap-3 md:col-span-1 md:row-span-2">
          <Link
            href="/grammar-de"
            className={`${TILE} flex flex-col items-center justify-center p-4`}
          >
            <div className="text-3xl font-bold text-accent">＿</div>
            <div className={`${LABEL} mt-2`}>Grammar</div>
            <div className="mt-1 text-[11px] text-muted">Fill the blank</div>
          </Link>
          <Link
            href="/articles"
            className={`${TILE} flex flex-col items-center justify-center p-4`}
          >
            <div className="flex gap-1 text-lg font-bold">
              <span className="text-der">der</span>
              <span className="text-die">die</span>
              <span className="text-das">das</span>
            </div>
            <div className={`${LABEL} mt-2`}>Articles</div>
            <div className="mt-1 text-[11px] text-muted">Practice quiz</div>
          </Link>
        </div>
      </div>
    </div>
  );
}
