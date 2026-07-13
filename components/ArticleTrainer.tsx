"use client";

// Interactive der/die/das article trainer. Shows a noun, user taps the article.
// Color-coded feedback (der=blue, die=red, das=green). Pulls from Goethe A1
// nouns. Score tracker. Includes article rules cheatsheet.

import { useMemo, useState, useCallback } from "react";
import { speakDe, canSpeak } from "@/lib/speak";
import { useMounted } from "@/lib/useMounted";
import { Icon } from "./Icon";
import { ARTICLE_COLOR } from "./Lex";

interface NounEntry {
  word: string;
  article: "der" | "die" | "das";
  plural?: string;
  meaning: string;
  tip?: string;
}

type Phase = "quiz" | "result";

const RULES = [
  { rule: "-ung, -heit, -keit, -schaft, -ei → die", example: "die Wohnung, die Freiheit, die Bäckerei" },
  { rule: "-chen, -lein → das", example: "das Mädchen, das Brötchen" },
  { rule: "-er, -ling, -ismus → der", example: "der Lehrer, der Frühling" },
  { rule: "Days, months, seasons → der", example: "der Montag, der Januar, der Sommer" },
  { rule: "Metals, chemical elements → das", example: "das Gold, das Eisen" },
  { rule: "Foreign words ending in -ment → das", example: "das Dokument, das Instrument" },
];

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function ArticleTrainer({ nouns }: { nouns: NounEntry[] }) {
  const deck = useMemo(() => shuffle(nouns), [nouns]);
  const [idx, setIdx] = useState(0);
  const [phase, setPhase] = useState<Phase>("quiz");
  const [picked, setPicked] = useState<string | null>(null);
  const [score, setScore] = useState({ correct: 0, total: 0 });
  const [showRules, setShowRules] = useState(false);
  const speech = useMounted() && canSpeak();

  const current = deck[idx % deck.length];

  const pick = useCallback(
    (article: string) => {
      if (phase !== "quiz") return;
      setPicked(article);
      setPhase("result");
      const isCorrect = article === current.article;
      setScore((s) => ({
        correct: s.correct + (isCorrect ? 1 : 0),
        total: s.total + 1,
      }));
      if (isCorrect && speech) speakDe(`${current.article} ${current.word}`);
    },
    [phase, current, speech]
  );

  const next = useCallback(() => {
    setIdx((i) => i + 1);
    setPhase("quiz");
    setPicked(null);
  }, []);

  const isCorrect = picked === current.article;

  return (
    <div>
      {/* score bar */}
      <div className="rise mb-4 flex items-center justify-between rounded-xl border border-line bg-surface px-4 py-3">
        <div className="text-sm text-muted">
          <span className="text-good font-bold">{score.correct}</span>/{score.total} correct
        </div>
        <div className="flex items-center gap-2 text-sm text-muted">
          {score.total > 0 && (
            <span className="font-mono">{Math.round((score.correct / score.total) * 100)}%</span>
          )}
          <button
            onClick={() => setShowRules((r) => !r)}
            className="press rounded-lg border border-line px-2.5 py-1 text-xs transition hover:border-accent hover:text-accent"
          >
            <Icon name="bulb" size={13} className="mr-1 inline" />
            Rules
          </button>
        </div>
      </div>

      {/* rules cheatsheet */}
      {showRules && (
        <div className="rise mb-4 rounded-xl border border-accent/30 bg-accent/5 p-4">
          <div className="mb-2 text-xs font-bold uppercase tracking-widest text-accent">
            Article Gender Rules
          </div>
          <div className="space-y-2">
            {RULES.map((r, i) => (
              <div key={i} className="text-sm">
                <div className="font-medium">{r.rule}</div>
                <div className="text-xs text-muted">{r.example}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* card */}
      <div className="rise rounded-2xl border border-line bg-surface p-8 text-center">
        <div className="mb-2 text-[10px] font-bold uppercase tracking-[2px] text-muted">
          What article?
        </div>
        <div className="text-4xl font-bold sm:text-5xl">{current.word}</div>
        <div className="mt-1 text-sm text-muted">{current.meaning}</div>
        {current.plural && (
          <div className="mt-0.5 text-xs text-muted">
            pl. <span className="text-die">die</span> {current.plural}
          </div>
        )}

        {/* article buttons */}
        <div className="mt-6 flex justify-center gap-3">
          {(["der", "die", "das"] as const).map((a) => {
            let cls = "border-line bg-surface2 text-ink hover:border-accent hover:-translate-y-0.5";
            if (phase === "result") {
              if (a === current.article) {
                cls = `border-2 ${a === "der" ? "border-der bg-der/10 text-der" : a === "die" ? "border-die bg-die/10 text-die" : "border-das bg-das/10 text-das"} scale-105`;
              } else if (a === picked) {
                cls = "border-red-500 bg-red-500/10 text-red-400 opacity-60";
              } else {
                cls = "border-line bg-surface2 opacity-30";
              }
            }
            return (
              <button
                key={a}
                onClick={() => pick(a)}
                disabled={phase === "result"}
                className={`press w-24 rounded-xl border-2 py-3 text-xl font-bold transition ${cls}`}
              >
                {a}
              </button>
            );
          })}
        </div>

        {/* result feedback */}
        {phase === "result" && (
          <div className="mt-5">
            <div
              className={`mb-1 text-lg font-bold ${isCorrect ? "text-good" : "text-accent"}`}
            >
              {isCorrect ? (
                <span className="inline-flex items-center gap-1">
                  <Icon name="check" size={18} /> Correct!
                </span>
              ) : (
                <span>
                  It&rsquo;s{" "}
                  <span className={ARTICLE_COLOR[current.article]}>
                    {current.article}
                  </span>{" "}
                  {current.word}
                </span>
              )}
            </div>
            {current.tip && (
              <div className="mx-auto max-w-xs text-sm text-muted">
                <Icon name="bulb" size={13} className="mr-1 inline text-accent" />
                {current.tip}
              </div>
            )}
            <button
              onClick={next}
              className="press mt-4 rounded-xl bg-accent px-8 py-2.5 text-sm font-semibold text-white shadow-[0_4px_16px_-4px] shadow-accent/50 transition hover:brightness-110"
            >
              Next →
            </button>
          </div>
        )}
      </div>

      {/* progress */}
      <div className="mt-3 text-center text-[10px] uppercase tracking-widest text-muted/50">
        {(idx % deck.length) + 1} / {deck.length}
      </div>
    </div>
  );
}
