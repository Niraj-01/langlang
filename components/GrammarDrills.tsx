"use client";

// Interactive fill-the-blank grammar practice from grammar_de.json.
// Shows prompt with ＿, tappable options, immediate feedback with "why" note.
// Progress bar across the set.

import { useMemo, useState, useCallback } from "react";
import { speakDe, canSpeak } from "@/lib/speak";
import { useMounted } from "@/lib/useMounted";
import { Icon } from "./Icon";

interface GrammarEntry {
  lang: string;
  prompt: string;
  options: string[];
  answer: number;
  note: string;
  translation: string;
}

type Phase = "question" | "answered";

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function GrammarDrills({ data }: { data: GrammarEntry[] }) {
  const deck = useMemo(() => shuffle(data), [data]);
  const [idx, setIdx] = useState(0);
  const [phase, setPhase] = useState<Phase>("question");
  const [picked, setPicked] = useState<number | null>(null);
  const [score, setScore] = useState({ correct: 0, total: 0 });
  const [finished, setFinished] = useState(false);
  const speech = useMounted() && canSpeak();

  const current = deck[idx];
  const isCorrect = picked === current?.answer;
  const progress = ((idx + (phase === "answered" ? 1 : 0)) / deck.length) * 100;

  const pick = useCallback(
    (optIdx: number) => {
      if (phase !== "question") return;
      setPicked(optIdx);
      setPhase("answered");
      const ok = optIdx === current.answer;
      setScore((s) => ({
        correct: s.correct + (ok ? 1 : 0),
        total: s.total + 1,
      }));
      if (ok && speech) {
        // Speak the complete sentence
        const filled = current.prompt.replace("＿", current.options[current.answer]);
        speakDe(filled);
      }
    },
    [phase, current, speech]
  );

  const next = useCallback(() => {
    if (idx + 1 >= deck.length) {
      setFinished(true);
      return;
    }
    setIdx((i) => i + 1);
    setPhase("question");
    setPicked(null);
  }, [idx, deck.length]);

  const restart = useCallback(() => {
    setIdx(0);
    setPhase("question");
    setPicked(null);
    setScore({ correct: 0, total: 0 });
    setFinished(false);
  }, []);

  if (finished) {
    const pct = Math.round((score.correct / score.total) * 100);
    return (
      <div className="rise rounded-2xl border border-line bg-surface p-8 text-center">
        <div className="text-5xl font-bold text-accent">{pct}%</div>
        <div className="mt-2 text-lg font-medium">
          {score.correct}/{score.total} correct
        </div>
        <div className="mt-1 text-sm text-muted">
          {pct >= 80 ? "Excellent! You know your articles." : pct >= 50 ? "Good progress — keep practicing!" : "Keep at it — review the rules and try again!"}
        </div>
        <button
          onClick={restart}
          className="press mt-6 rounded-xl bg-accent px-8 py-2.5 text-sm font-semibold text-white shadow-[0_4px_16px_-4px] shadow-accent/50 transition hover:brightness-110"
        >
          Try again
        </button>
      </div>
    );
  }

  return (
    <div>
      {/* progress bar */}
      <div className="rise mb-4">
        <div className="mb-1 flex justify-between text-[10px] uppercase tracking-widest text-muted/50">
          <span>{idx + 1}/{deck.length}</span>
          <span className="text-good">{score.correct} correct</span>
        </div>
        <div className="h-2 w-full rounded-full border border-line bg-black/20">
          <div
            className="bar-anim h-full rounded-full bg-accent"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* card */}
      <div className="rise rounded-2xl border border-line bg-surface p-6 text-center sm:p-8">
        <div className="mb-1 text-[10px] font-bold uppercase tracking-[2px] text-muted">
          Fill in the blank
        </div>

        {/* prompt */}
        <div className="mt-4 text-2xl font-bold leading-relaxed sm:text-3xl">
          {current.prompt.split("＿").map((part, i, arr) => (
            <span key={i}>
              {part}
              {i < arr.length - 1 && (
                <span
                  className={`inline-block min-w-[3ch] border-b-2 px-1 ${
                    phase === "answered"
                      ? isCorrect
                        ? "border-good text-good"
                        : "border-accent text-accent"
                      : "border-muted text-transparent"
                  }`}
                >
                  {phase === "answered" ? current.options[current.answer] : "___"}
                </span>
              )}
            </span>
          ))}
        </div>

        <div className="mt-2 text-sm text-muted">{current.translation}</div>

        {/* options */}
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          {current.options.map((opt, i) => {
            let cls = "border-line bg-surface2 hover:border-accent hover:-translate-y-0.5";
            if (phase === "answered") {
              if (i === current.answer) {
                cls = "border-good bg-good/10 text-good scale-105";
              } else if (i === picked) {
                cls = "border-red-500 bg-red-500/10 text-red-400 opacity-60";
              } else {
                cls = "border-line bg-surface2 opacity-30";
              }
            }
            return (
              <button
                key={i}
                onClick={() => pick(i)}
                disabled={phase === "answered"}
                className={`press min-w-[80px] rounded-xl border-2 px-5 py-2.5 text-lg font-bold transition ${cls}`}
              >
                {opt}
              </button>
            );
          })}
        </div>

        {/* feedback */}
        {phase === "answered" && (
          <div className="mt-5">
            <div className={`mb-1 text-lg font-bold ${isCorrect ? "text-good" : "text-accent"}`}>
              {isCorrect ? (
                <span className="inline-flex items-center gap-1">
                  <Icon name="check" size={18} /> Correct!
                </span>
              ) : (
                "Not quite"
              )}
            </div>
            <div className="mx-auto max-w-sm text-sm text-muted">
              <Icon name="bulb" size={13} className="mr-1 inline text-accent" />
              {current.note}
            </div>
            <button
              onClick={next}
              className="press mt-4 rounded-xl bg-accent px-8 py-2.5 text-sm font-semibold text-white shadow-[0_4px_16px_-4px] shadow-accent/50 transition hover:brightness-110"
            >
              {idx + 1 < deck.length ? "Next →" : "See results"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
