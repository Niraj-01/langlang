"use client";

// Lesson mode — a Duolingo-style session with 5 hearts. Sources:
//   ?unit=N       → that Path unit's 8 seed words (finishing it adds them
//                   to the deck, which advances the Path frontier)
//   ?mode=mistakes → your mistake log
//   ?mode=review   → your weakest FSRS cards
// Exercises: multiple choice, reverse MC, type-the-meaning, match pairs.

import { useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { SEED } from "@/lib/seed";
import {
  useApp,
  addNewWord,
  awardXp,
  logMistake,
  clearMistake,
  getState,
} from "@/lib/store";
import {
  buildLesson,
  toLessonWords,
  typedCorrect,
  HEARTS,
  XP_PER_CORRECT,
  accuracyLabel,
  type Exercise,
  type LessonWord,
} from "@/lib/lesson";
import { UNIT_SIZE } from "@/lib/path";
import { useMounted } from "@/lib/useMounted";
import { speak as tts, sfxCorrect, sfxWrong, sfxBonus } from "@/lib/audio";
import { burst } from "@/lib/confetti";
import { JaWord, DeNoun } from "@/components/Lex";
import type { Lang } from "@/lib/types";

type Phase = "play" | "win" | "fail";

export function Lesson() {
  const state = useApp();
  const mounted = useMounted();
  const params = useSearchParams();
  const [seedKey, setSeedKey] = useState(0); // bump to rebuild (retry)

  const lang = state.lang;
  const unitParam = params.get("unit");
  const mode = params.get("mode"); // mistakes | review | null

  // words for this session — memoized so exercises don't reshuffle mid-lesson
  const session = useMemo(() => {
    if (!mounted) return null;
    const s = getState();
    const l = s.lang;
    if (unitParam !== null) {
      const u = Math.max(0, parseInt(unitParam, 10) || 0);
      const start = u * UNIT_SIZE;
      const words = toLessonWords(SEED[l].slice(start, start + UNIT_SIZE));
      return { words, unit: u, title: `Unit ${u + 1}` };
    }
    if (mode === "mistakes") {
      const words: LessonWord[] = s.mistakeLog
        .filter((m) => m.lang === l)
        .slice(0, 8)
        .map((m) => ({ word: m.word, meaning: m.meaning, reading: m.reading }));
      return { words, unit: null, title: "Mistake Rehab" };
    }
    // review: weakest cards first
    const words = [...s.cards]
      .filter((c) => c.lang === l)
      .sort((a, b) => a.fsrs.stability - b.fsrs.stability)
      .slice(0, 8)
      .map((c) => ({
        word: c.word,
        meaning: c.meaning,
        reading: c.reading,
        article: c.article,
      }));
    return { words, unit: null, title: "Weak Words" };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted, unitParam, mode, seedKey]);

  const exercises = useMemo(
    () => (session && session.words.length >= 4 ? buildLesson(session.words, toLessonWords(SEED[lang])) : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [session]
  );

  const [idx, setIdx] = useState(0);
  const [hearts, setHearts] = useState(HEARTS);
  const [correct, setCorrect] = useState(0);
  const [wrongFlash, setWrongFlash] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase>("play");
  const [t0] = useState(() => Date.now());
  const [finishedAt, setFinishedAt] = useState(0);

  if (!mounted || !session) return <div className="lang-ja h-dvh bg-bg" />;

  const accent = lang === "ja" ? "lang-ja" : "lang-de";

  if (session.words.length < 4) {
    return (
      <Shell accent={accent} title={session.title}>
        <div className="flex flex-1 flex-col items-center justify-center gap-4 p-6 text-center">
          <div className="text-5xl">🍃</div>
          <div className="opacity-70">
            Not enough words here yet — {mode === "mistakes" ? "no recent mistakes. Go make some." : "learn a few words in the feed first."}
          </div>
          <Link href={mode === "mistakes" ? "/path" : "/reels"} className="btn-primary">
            {mode === "mistakes" ? "BACK TO PATH" : "▶ OPEN THE FEED"}
          </Link>
        </div>
      </Shell>
    );
  }

  const finishWin = () => {
    setFinishedAt(Date.now());
    const xp = correct * XP_PER_CORRECT;
    awardXp(xp);
    // completing the frontier unit deals its words into the deck
    if (session.unit !== null) {
      const start = session.unit * UNIT_SIZE;
      const end = Math.min(SEED[lang].length, start + UNIT_SIZE);
      for (let i = getState().newIndex[lang]; i < end; i++) {
        if (i >= start) addNewWord(lang, i);
      }
    }
    if (mode === "mistakes") {
      for (const w of session.words) clearMistake(lang, w.word);
    }
    sfxBonus();
    burst(innerWidth / 2, innerHeight / 3, undefined, 120);
    setPhase("win");
  };

  const advance = () => {
    if (idx + 1 >= exercises.length) finishWin();
    else setIdx(idx + 1);
  };

  const onResult = (ok: boolean, word: LessonWord, answerShown?: string) => {
    if (ok) {
      sfxCorrect(correct);
      setCorrect((c) => c + 1);
      tts(word.word, lang);
      setTimeout(advance, 650);
    } else {
      sfxWrong();
      logMistake({ lang, word: word.word, meaning: word.meaning, reading: word.reading });
      setWrongFlash(answerShown ?? `${word.word} — ${word.meaning}`);
      const left = hearts - 1;
      setHearts(left);
      setTimeout(() => {
        setWrongFlash(null);
        if (left <= 0) setPhase("fail");
        else advance();
      }, 1600);
    }
  };

  const retry = () => {
    setIdx(0);
    setHearts(HEARTS);
    setCorrect(0);
    setPhase("play");
    setSeedKey((k) => k + 1);
  };

  const total = exercises.length;
  const acc = total ? Math.round((correct / total) * 100) : 0;
  const secs = Math.max(1, Math.round(((finishedAt || Date.now()) - t0) / 1000));

  return (
    <Shell
      accent={accent}
      title={session.title}
      hearts={phase === "play" ? hearts : undefined}
      progress={phase === "play" ? idx / total : 1}
    >
      {phase === "play" && (
        <div className="relative flex flex-1 flex-col p-4">
          <AnimatePresence mode="wait">
            <motion.div
              key={idx}
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -40 }}
              transition={{ duration: 0.22 }}
              className="flex flex-1 flex-col"
            >
              <ExerciseView
                ex={exercises[idx]}
                lang={lang}
                furigana={state.furigana}
                onResult={onResult}
              />
            </motion.div>
          </AnimatePresence>

          <AnimatePresence>
            {wrongFlash && (
              <motion.div
                initial={{ y: 60, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 60, opacity: 0 }}
                className="absolute inset-x-4 bottom-4 border-4 border-bad bg-bg p-4"
                style={{ boxShadow: "6px 6px 0 rgba(0,0,0,.6)" }}
              >
                <div className="text-[10px] uppercase tracking-widest text-bad">correct answer</div>
                <div className={`mt-1 text-lg ${lang === "ja" ? "font-jp" : ""}`}>{wrongFlash}</div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {phase === "win" && (
        <div className="flex flex-1 flex-col items-center justify-center gap-5 p-6 text-center">
          <motion.div
            initial={{ scale: 0, rotate: -15 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring", stiffness: 260, damping: 14 }}
            className="text-7xl"
          >
            🏅
          </motion.div>
          <div className="font-display text-3xl text-(--accent)">LESSON CLEAR</div>
          <div className="grid w-full max-w-xs grid-cols-3 gap-2">
            <EndStat label="xp" value={`+${correct * XP_PER_CORRECT}`} />
            <EndStat label="accuracy" value={`${acc}%`} />
            <EndStat label="time" value={`${secs}s`} />
          </div>
          <div className="text-sm opacity-60">{accuracyLabel(acc, lang)}</div>
          {session.unit !== null && (
            <div className="text-[10px] uppercase tracking-[0.3em] text-(--accent)">
              unit words added to your deck — the feed takes it from here
            </div>
          )}
          <div className="grid w-full max-w-xs grid-cols-2 gap-3">
            <Link href="/path" className="btn-ghost text-center">
              THE PATH
            </Link>
            <Link href="/reels" className="btn-primary text-center">
              CONTINUE ▶
            </Link>
          </div>
        </div>
      )}

      {phase === "fail" && (
        <div className="flex flex-1 flex-col items-center justify-center gap-5 p-6 text-center">
          <div className="text-7xl">💔</div>
          <div className="font-display text-3xl text-bad">OUT OF HEARTS</div>
          <div className="max-w-xs text-sm opacity-60">
            Every miss was filed into your mistake log. Take a breath and run it back.
          </div>
          <div className="grid w-full max-w-xs grid-cols-2 gap-3">
            <Link href="/path" className="btn-ghost text-center">
              RETREAT
            </Link>
            <button className="btn-primary" onClick={retry}>
              ↻ RETRY
            </button>
          </div>
        </div>
      )}
    </Shell>
  );
}

// ---- chrome ----------------------------------------------------------------

function Shell({
  accent,
  title,
  hearts,
  progress,
  children,
}: {
  accent: string;
  title: string;
  hearts?: number;
  progress?: number;
  children: React.ReactNode;
}) {
  return (
    <div className={`${accent} flex h-dvh flex-col bg-bg`}>
      <div className="border-b-2 border-line p-3">
        <div className="flex items-center justify-between">
          <Link href="/path" className="hud-chip" title="Quit lesson">
            ✕
          </Link>
          <div className="font-display text-sm uppercase tracking-[0.3em] text-(--accent)">
            {title}
          </div>
          <div className="hud-chip" title="Hearts">
            {hearts === undefined ? "♥" : `${"♥".repeat(Math.max(0, hearts))}` || "💔"}
          </div>
        </div>
        {progress !== undefined && (
          <div className="mt-2 h-2 w-full border-2 border-line bg-black/40">
            <div className="bar-anim h-full bg-(--accent)" style={{ width: `${progress * 100}%` }} />
          </div>
        )}
      </div>
      {children}
    </div>
  );
}

function EndStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-2 border-line bg-panel p-2">
      <div className="font-display text-xl">{value}</div>
      <div className="text-[9px] uppercase tracking-widest opacity-50">{label}</div>
    </div>
  );
}

// ---- exercises ---------------------------------------------------------------

function Prompt({ word, lang, furigana }: { word: LessonWord; lang: Lang; furigana: boolean }) {
  return (
    <button
      type="button"
      className="press mx-auto my-6 block text-center"
      onClick={() => tts(word.word, lang)}
      title="Hear it"
    >
      {lang === "ja" ? (
        <JaWord word={word.word} reading={word.reading} furigana={furigana} className="text-6xl" />
      ) : (
        <DeNoun entry={word} className="text-5xl font-bold" />
      )}
      <div className="mt-2 text-xs uppercase tracking-[0.3em] opacity-40">🔊 tap to hear</div>
    </button>
  );
}

function ExerciseView({
  ex,
  lang,
  furigana,
  onResult,
}: {
  ex: Exercise;
  lang: Lang;
  furigana: boolean;
  onResult: (ok: boolean, word: LessonWord, answerShown?: string) => void;
}) {
  if (ex.kind === "mc") return <Mc ex={ex} lang={lang} furigana={furigana} onResult={onResult} />;
  if (ex.kind === "rmc") return <Rmc ex={ex} lang={lang} onResult={onResult} />;
  if (ex.kind === "type") return <TypeIt ex={ex} lang={lang} furigana={furigana} onResult={onResult} />;
  return <Match ex={ex} lang={lang} onResult={onResult} />;
}

function Mc({
  ex,
  lang,
  furigana,
  onResult,
}: {
  ex: Extract<Exercise, { kind: "mc" }>;
  lang: Lang;
  furigana: boolean;
  onResult: (ok: boolean, word: LessonWord) => void;
}) {
  const [picked, setPicked] = useState<number | null>(null);
  return (
    <>
      <div className="tag text-center">what does it mean?</div>
      <Prompt word={ex.word} lang={lang} furigana={furigana} />
      <div className="mt-auto grid grid-cols-1 gap-2">
        {ex.options.map((opt, i) => {
          let cls = "btn-option";
          if (picked !== null) {
            if (i === ex.answer) cls += " correct";
            else if (i === picked) cls += " wrong";
            else cls += " opacity-40";
          }
          return (
            <button
              key={i}
              className={cls}
              disabled={picked !== null}
              onClick={() => {
                setPicked(i);
                onResult(i === ex.answer, ex.word);
              }}
            >
              {opt}
            </button>
          );
        })}
      </div>
    </>
  );
}

function Rmc({
  ex,
  lang,
  onResult,
}: {
  ex: Extract<Exercise, { kind: "rmc" }>;
  lang: Lang;
  onResult: (ok: boolean, word: LessonWord) => void;
}) {
  const [picked, setPicked] = useState<number | null>(null);
  return (
    <>
      <div className="tag text-center">pick the word for</div>
      <div className="my-8 text-center text-3xl font-bold">{ex.word.meaning}</div>
      <div className="mt-auto grid grid-cols-2 gap-2">
        {ex.options.map((opt, i) => {
          let cls = "btn-option text-center";
          if (picked !== null) {
            if (i === ex.answer) cls += " correct";
            else if (i === picked) cls += " wrong";
            else cls += " opacity-40";
          }
          return (
            <button
              key={i}
              className={`${cls} ${lang === "ja" ? "font-jp" : ""}`}
              disabled={picked !== null}
              onClick={() => {
                setPicked(i);
                onResult(i === ex.answer, ex.word);
              }}
            >
              {opt.word}
            </button>
          );
        })}
      </div>
    </>
  );
}

function TypeIt({
  ex,
  lang,
  furigana,
  onResult,
}: {
  ex: Extract<Exercise, { kind: "type" }>;
  lang: Lang;
  furigana: boolean;
  onResult: (ok: boolean, word: LessonWord) => void;
}) {
  const [val, setVal] = useState("");
  const [done, setDone] = useState(false);
  const submit = () => {
    if (done || !val.trim()) return;
    setDone(true);
    onResult(typedCorrect(val, ex.word.meaning), ex.word);
  };
  return (
    <>
      <div className="tag text-center">type the meaning (english)</div>
      <Prompt word={ex.word} lang={lang} furigana={furigana} />
      <form
        className="mt-auto flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <input
          autoFocus
          className="min-w-0 flex-1 border-4 border-line bg-black/30 px-3 py-3 text-lg outline-none focus:border-(--accent)"
          placeholder="meaning…"
          value={val}
          disabled={done}
          onChange={(e) => setVal(e.target.value)}
        />
        <button className="btn-primary !px-5 !py-3" disabled={done || !val.trim()}>
          ✓
        </button>
      </form>
    </>
  );
}

function Match({
  ex,
  lang,
  onResult,
}: {
  ex: Extract<Exercise, { kind: "match" }>;
  lang: Lang;
  onResult: (ok: boolean, word: LessonWord) => void;
}) {
  // one aggregate "correct" when all pairs land; wrong taps shake but don't
  // cost hearts (matching is a warm-up, like Duolingo's).
  const [left] = useState(() => ex.pairs);
  const [right] = useState(() => [...ex.pairs].sort(() => Math.random() - 0.5));
  const [selL, setSelL] = useState<number | null>(null);
  const [doneWords, setDoneWords] = useState<Set<string>>(new Set());
  const [shake, setShake] = useState<number | null>(null);

  const tryMatch = (ri: number) => {
    if (selL === null) return;
    const w = left[selL];
    if (right[ri].word === w.word) {
      const next = new Set(doneWords).add(w.word);
      setDoneWords(next);
      setSelL(null);
      sfxCorrect(next.size);
      if (next.size === ex.pairs.length) onResult(true, ex.pairs[0]);
    } else {
      sfxWrong();
      setShake(ri);
      setSelL(null);
      setTimeout(() => setShake(null), 400);
    }
  };

  return (
    <>
      <div className="tag text-center">match the pairs</div>
      <div className="mt-8 grid flex-1 grid-cols-2 content-start gap-2">
        <div className="space-y-2">
          {left.map((w, i) => (
            <button
              key={w.word}
              disabled={doneWords.has(w.word)}
              onClick={() => setSelL(i)}
              className={`btn-option w-full text-center ${lang === "ja" ? "font-jp" : ""} ${
                doneWords.has(w.word) ? "correct opacity-40" : selL === i ? "!border-(--accent)" : ""
              }`}
            >
              {w.word}
            </button>
          ))}
        </div>
        <div className="space-y-2">
          {right.map((w, i) => (
            <motion.button
              key={w.word}
              animate={shake === i ? { x: [0, -6, 6, -4, 0] } : {}}
              disabled={doneWords.has(w.word)}
              onClick={() => tryMatch(i)}
              className={`btn-option w-full text-center text-base ${
                doneWords.has(w.word) ? "correct opacity-40" : ""
              }`}
            >
              {w.meaning}
            </motion.button>
          ))}
        </div>
      </div>
    </>
  );
}
