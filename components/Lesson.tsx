"use client";

// Lesson mode — a Duolingo-style session with 5 hearts, restyled to the
// "Onboarding & Lesson" design: calm dark surface, red progress + primary
// pill, blue readings, green success, and a two-stage Check → Continue flow
// with a feedback banner. Sources:
//   ?unit=N        → that Path unit's 8 seed words (finishing it adds them
//                    to the deck, which advances the Path frontier)
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

// Design palette (shared with Onboarding — calm zone, not the arcade feed)
const C = {
  bg: "#0f1115",
  panel: "#171a21",
  line: "#2b303b",
  red: "#ff5a5f",
  blue: "#4aa8ff",
  green: "#48c78e",
  muted: "#9aa3b2",
  dim: "#5b6472",
  disabled: "#1f232c",
  text: "#f2f4f8",
};

const optionStyle = (state: "idle" | "picked" | "correct" | "wrong" | "faded" | "matched" | "selected") => {
  switch (state) {
    case "picked":
      return { borderColor: C.red, background: "rgba(255,90,95,0.1)", color: C.red };
    case "correct":
    case "matched":
      return { borderColor: C.green, background: "rgba(72,199,142,0.12)", color: C.green };
    case "wrong":
      return { borderColor: C.red, background: "rgba(255,90,95,0.1)", color: C.red };
    case "faded":
      return { borderColor: C.line, background: C.panel, color: C.muted };
    case "selected":
      return { borderColor: C.blue, background: "rgba(74,168,255,0.1)", color: C.blue };
    default:
      return { borderColor: C.line, background: C.panel, color: C.text };
  }
};

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
    // seed lookup so mistake/review words can still surface their coaching tip
    const seedByWord = new Map(SEED[l].map((e) => [e.word, e]));
    if (mode === "mistakes") {
      const words: LessonWord[] = s.mistakeLog
        .filter((m) => m.lang === l)
        .slice(0, 8)
        .map((m) => {
          const e = seedByWord.get(m.word);
          return {
            word: m.word,
            meaning: m.meaning,
            reading: m.reading,
            tip: m.tip ?? e?.tip,
            mnemonic: m.mnemonic ?? e?.mnemonic,
          };
        });
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
        tip: c.tip ?? seedByWord.get(c.word)?.tip,
        mnemonic: c.mnemonic ?? seedByWord.get(c.word)?.mnemonic,
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
  const [phase, setPhase] = useState<Phase>("play");
  const [t0] = useState(() => Date.now());
  const [finishedAt, setFinishedAt] = useState(0);

  if (!mounted || !session) return <div className="h-dvh" style={{ background: C.bg }} />;

  if (session.words.length < 4) {
    return (
      <Shell title={session.title}>
        <div className="flex flex-1 flex-col items-center justify-center gap-4 p-6 text-center">
          <div className="text-5xl">🍃</div>
          <div style={{ color: C.muted }}>
            Not enough words here yet —{" "}
            {mode === "mistakes" ? "no recent mistakes. Go make some." : "learn a few words in the feed first."}
          </div>
          <Link
            href={mode === "mistakes" ? "/path" : "/reels"}
            className="rounded-full px-8 py-4 text-[15px] font-bold text-white"
            style={{ background: C.red }}
          >
            {mode === "mistakes" ? "Back to path" : "Open the feed"}
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

  // called the moment an answer is checked (sound within 100ms of the tap)
  const onChecked = (ok: boolean, word: LessonWord) => {
    if (ok) {
      sfxCorrect(correct);
      setCorrect((c) => c + 1);
      tts(word.word, lang);
    } else {
      sfxWrong();
      logMistake({ lang, word: word.word, meaning: word.meaning, reading: word.reading });
      setHearts((h) => h - 1);
    }
  };

  // called when the user taps Continue after the feedback banner
  const onNext = (ok: boolean) => {
    if (!ok && hearts <= 0) {
      setPhase("fail");
      return;
    }
    if (idx + 1 >= exercises.length) finishWin();
    else setIdx(idx + 1);
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
      title={session.title}
      hearts={phase === "play" ? hearts : undefined}
      progress={phase === "play" ? idx / total : undefined}
    >
      {phase === "play" && (
        <AnimatePresence mode="wait">
          <motion.div
            key={idx}
            initial={{ opacity: 0, x: 32 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -32 }}
            transition={{ duration: 0.2 }}
            className="flex flex-1 flex-col"
          >
            <ExerciseView
              ex={exercises[idx]}
              lang={lang}
              furigana={state.furigana}
              onChecked={onChecked}
              onNext={onNext}
            />
          </motion.div>
        </AnimatePresence>
      )}

      {phase === "win" && (
        <div className="flex flex-1 flex-col p-6">
          <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 260, damping: 14 }}
              className={`text-[88px] leading-none font-medium ${lang === "ja" ? "font-jp" : ""}`}
              style={{ color: C.green }}
            >
              {lang === "ja" ? "完" : "✓"}
            </motion.span>
            <div className="text-2xl font-bold">Lesson complete</div>
            <div className="max-w-62 text-sm" style={{ color: C.muted }}>
              {accuracyLabel(acc, lang)}
              {session.unit !== null && " Unit words were added to your deck — the feed takes it from here."}
            </div>
            <div className="mt-2 flex items-stretch gap-6">
              <EndStat label="XP" value={`+${correct * XP_PER_CORRECT}`} />
              <div className="w-px" style={{ background: C.line }} />
              <EndStat label="Accuracy" value={`${acc}%`} />
              <div className="w-px" style={{ background: C.line }} />
              <EndStat label="Time" value={`${secs}s`} />
            </div>
          </div>
          <div className="flex flex-col gap-3">
            <Link
              href="/reels"
              className="w-full rounded-full py-4 text-center text-[15px] font-bold text-white"
              style={{ background: C.red }}
            >
              Continue
            </Link>
            <Link
              href="/path"
              className="w-full rounded-full border py-4 text-center text-[15px] font-bold"
              style={{ borderColor: C.line, color: C.muted }}
            >
              Back to path
            </Link>
          </div>
        </div>
      )}

      {phase === "fail" && (
        <div className="flex flex-1 flex-col p-6">
          <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
            <span className="text-6xl">💔</span>
            <div className="text-2xl font-bold">Out of hearts</div>
            <div className="max-w-62 text-sm" style={{ color: C.muted }}>
              Every miss was filed into your mistakes. Take a breath and run it back.
            </div>
          </div>
          <div className="flex flex-col gap-3">
            <button
              className="w-full rounded-full py-4 text-[15px] font-bold text-white"
              style={{ background: C.red }}
              onClick={retry}
            >
              Retry
            </button>
            <Link
              href="/path"
              className="w-full rounded-full border py-4 text-center text-[15px] font-bold"
              style={{ borderColor: C.line, color: C.muted }}
            >
              Back to path
            </Link>
          </div>
        </div>
      )}
    </Shell>
  );
}

// ---- chrome ----------------------------------------------------------------

function Shell({
  title,
  hearts,
  progress,
  children,
}: {
  title: string;
  hearts?: number;
  progress?: number;
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-dvh flex-col" style={{ background: C.bg, color: C.text }}>
      <div className="mx-auto flex h-full w-full max-w-md flex-col px-6 pt-7 pb-10">
        <div className="mb-6 flex items-center gap-3.5">
          <Link href="/path" className="text-lg" style={{ color: C.muted }} title="Quit lesson" aria-label="Quit lesson">
            ✕
          </Link>
          {progress !== undefined ? (
            <div className="h-1.5 flex-1 rounded-full" style={{ background: C.line }}>
              <div
                className="h-1.5 rounded-full transition-all duration-300"
                style={{ width: `${Math.max(4, progress * 100)}%`, background: C.red }}
              />
            </div>
          ) : (
            <div className="flex-1 text-center text-xs font-bold tracking-[2px] uppercase" style={{ color: C.dim }}>
              {title}
            </div>
          )}
          {hearts !== undefined && (
            <div className="text-sm font-bold" style={{ color: hearts <= 1 ? C.red : C.muted }} title="Hearts">
              <span style={{ color: C.red }}>♥</span> {hearts}
            </div>
          )}
        </div>
        {children}
      </div>
    </div>
  );
}

function EndStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-center">
      <div className="text-[22px] font-bold">{value}</div>
      <div className="mt-0.5 text-[10px] font-bold tracking-[2px] uppercase" style={{ color: C.muted }}>
        {label}
      </div>
    </div>
  );
}

function Kicker({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-2 text-[10px] font-bold tracking-[2px] uppercase" style={{ color: C.blue }}>
      {children}
    </div>
  );
}

function Heading({ children }: { children: React.ReactNode }) {
  return <div className="mb-4 text-[19px] font-bold">{children}</div>;
}

/** 🔊 word chip — the audio prompt from the design (S7). */
function AudioChip({ word, lang, furigana }: { word: LessonWord; lang: Lang; furigana: boolean }) {
  return (
    <button
      type="button"
      className="mb-5 inline-flex items-center gap-2.5 self-start rounded-xl border px-4 py-2.5"
      style={{ borderColor: C.line, background: C.panel }}
      onClick={() => tts(word.word, lang)}
      title="Hear it"
    >
      <span className="text-[15px]">🔊</span>
      {lang === "ja" ? (
        <JaWord word={word.word} reading={word.reading} furigana={furigana} className="text-[26px]" />
      ) : (
        <DeNoun entry={word} className="text-[22px] font-bold" />
      )}
      {lang === "ja" && !furigana && word.reading && word.reading !== word.word && (
        <span className="text-[13px] tracking-wider" style={{ color: C.blue }}>
          {word.reading}
        </span>
      )}
    </button>
  );
}

/** Feedback banner + Check/Continue pill (the two-stage flow from the design). */
function CheckBar({
  picked,
  checked,
  ok,
  answer,
  coach,
  onCheck,
  onNext,
}: {
  picked: boolean;
  checked: boolean;
  ok: boolean;
  answer: string;
  coach?: string; // tip / mnemonic shown after a miss
  onCheck: () => void;
  onNext: () => void;
}) {
  return (
    <>
      {checked && (
        <motion.div
          initial={{ y: 12, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="mb-3 rounded-xl px-4 py-3 text-sm font-semibold"
          style={
            ok
              ? { background: "rgba(72,199,142,0.12)", color: C.green }
              : { background: "rgba(255,90,95,0.1)", color: C.red }
          }
        >
          {ok ? "Nicely done." : `Not quite — it’s ${answer}. You’ll see it again soon.`}
          {!ok && coach && (
            <div className="mt-2 flex gap-2 text-[13px] font-normal leading-snug" style={{ color: C.muted }}>
              <span>💡</span>
              <span>{coach}</span>
            </div>
          )}
        </motion.div>
      )}
      <button
        className="w-full rounded-full py-4 text-[15px] font-bold transition-colors"
        style={{
          background: picked ? C.red : C.disabled,
          color: picked ? "#fff" : C.dim,
        }}
        disabled={!picked}
        onClick={checked ? onNext : onCheck}
      >
        {checked ? "Continue" : "Check"}
      </button>
    </>
  );
}

// ---- exercises ---------------------------------------------------------------

interface ExProps {
  lang: Lang;
  furigana: boolean;
  onChecked: (ok: boolean, word: LessonWord) => void;
  onNext: (ok: boolean) => void;
}

function ExerciseView({ ex, ...p }: ExProps & { ex: Exercise }) {
  if (ex.kind === "mc") return <Mc ex={ex} {...p} />;
  if (ex.kind === "rmc") return <Rmc ex={ex} {...p} />;
  if (ex.kind === "type") return <TypeIt ex={ex} {...p} />;
  return <Match ex={ex} {...p} />;
}

function Mc({ ex, lang, furigana, onChecked, onNext }: ExProps & { ex: Extract<Exercise, { kind: "mc" }> }) {
  const [picked, setPicked] = useState<number | null>(null);
  const [checked, setChecked] = useState(false);
  const ok = picked === ex.answer;

  const stateOf = (i: number) => {
    if (!checked) return i === picked ? "picked" : "idle";
    if (i === ex.answer) return "correct";
    if (i === picked) return "wrong";
    return "faded";
  };

  return (
    <>
      <Kicker>New word</Kicker>
      <Heading>Select the correct meaning</Heading>
      <AudioChip word={ex.word} lang={lang} furigana={furigana} />
      <div className="flex flex-col gap-2.5">
        {ex.options.map((opt, i) => (
          <button
            key={i}
            className="rounded-xl border px-4.5 py-4 text-left text-[15px] font-semibold transition-colors"
            style={optionStyle(stateOf(i))}
            disabled={checked}
            onClick={() => setPicked(i)}
          >
            {opt}
          </button>
        ))}
      </div>
      <div className="flex-1" />
      <CheckBar
        picked={picked !== null}
        checked={checked}
        ok={ok}
        answer={`${ex.word.meaning} ${ex.word.word}`}
        coach={ex.word.tip ?? ex.word.mnemonic}
        onCheck={() => {
          setChecked(true);
          onChecked(ok, ex.word);
        }}
        onNext={() => onNext(ok)}
      />
    </>
  );
}

function Rmc({ ex, lang, onChecked, onNext }: ExProps & { ex: Extract<Exercise, { kind: "rmc" }> }) {
  const [picked, setPicked] = useState<number | null>(null);
  const [checked, setChecked] = useState(false);
  const ok = picked === ex.answer;

  const stateOf = (i: number) => {
    if (!checked) return i === picked ? "picked" : "idle";
    if (i === ex.answer) return "correct";
    if (i === picked) return "wrong";
    return "faded";
  };

  return (
    <>
      <Heading>How do you say “{ex.word.meaning}”?</Heading>
      <div className="grid grid-cols-2 gap-2.5">
        {ex.options.map((opt, i) => (
          <button
            key={i}
            className="flex h-24 flex-col items-center justify-center gap-1 rounded-xl border transition-colors"
            style={optionStyle(stateOf(i))}
            disabled={checked}
            onClick={() => {
              setPicked(i);
              if (!checked) tts(opt.word, lang);
            }}
          >
            <span className={lang === "ja" ? "font-jp text-[28px]" : "text-xl font-bold"}>{opt.word}</span>
            {lang === "ja" && opt.reading && opt.reading !== opt.word && (
              <span className="text-xs tracking-wider" style={{ color: C.blue }}>
                {opt.reading}
              </span>
            )}
          </button>
        ))}
      </div>
      <div className="flex-1" />
      <CheckBar
        picked={picked !== null}
        checked={checked}
        ok={ok}
        answer={`${ex.word.word} ${ex.word.meaning}`}
        coach={ex.word.tip ?? ex.word.mnemonic}
        onCheck={() => {
          setChecked(true);
          onChecked(ok, ex.word);
        }}
        onNext={() => onNext(ok)}
      />
    </>
  );
}

function TypeIt({ ex, lang, furigana, onChecked, onNext }: ExProps & { ex: Extract<Exercise, { kind: "type" }> }) {
  const [val, setVal] = useState("");
  const [checked, setChecked] = useState(false);
  const [ok, setOk] = useState(false);

  const check = () => {
    if (checked || !val.trim()) return;
    const good = typedCorrect(val, ex.word.meaning);
    setOk(good);
    setChecked(true);
    onChecked(good, ex.word);
  };

  return (
    <>
      <Kicker>Type it</Kicker>
      <Heading>What does this mean?</Heading>
      <AudioChip word={ex.word} lang={lang} furigana={furigana} />
      <form
        onSubmit={(e) => {
          e.preventDefault();
          check();
        }}
      >
        <input
          autoFocus
          className="w-full rounded-xl border px-4 py-3.5 text-[15px] outline-none"
          style={{ borderColor: C.line, background: C.panel, color: C.text }}
          placeholder="Type the meaning in English…"
          value={val}
          disabled={checked}
          onChange={(e) => setVal(e.target.value)}
        />
      </form>
      <div className="flex-1" />
      <CheckBar
        picked={val.trim().length > 0}
        checked={checked}
        ok={ok}
        answer={`${ex.word.meaning} ${ex.word.word}`}
        coach={ex.word.tip ?? ex.word.mnemonic}
        onCheck={check}
        onNext={() => onNext(ok)}
      />
    </>
  );
}

function Match({ ex, lang, onChecked, onNext }: ExProps & { ex: Extract<Exercise, { kind: "match" }> }) {
  // wrong taps deselect but don't cost hearts (matching is a warm-up)
  const [left] = useState(() => ex.pairs);
  const [right] = useState(() => [...ex.pairs].sort(() => Math.random() - 0.5));
  const [selL, setSelL] = useState<number | null>(null);
  const [done, setDone] = useState<Set<string>>(new Set());
  const [shake, setShake] = useState<number | null>(null);
  const complete = done.size === ex.pairs.length;

  const tryMatch = (ri: number) => {
    if (selL === null || done.has(right[ri].word)) return;
    const w = left[selL];
    if (right[ri].word === w.word) {
      const next = new Set(done).add(w.word);
      setDone(next);
      setSelL(null);
      sfxCorrect(next.size);
      tts(w.word, lang);
      if (next.size === ex.pairs.length) onChecked(true, ex.pairs[0]);
    } else {
      sfxWrong();
      setShake(ri);
      setSelL(null);
      setTimeout(() => setShake(null), 400);
    }
  };

  const styleOf = (word: string, selected: boolean) =>
    optionStyle(done.has(word) ? "matched" : selected ? "selected" : "idle");

  return (
    <>
      <Heading>Tap the matching pairs</Heading>
      <div className="-mt-2 mb-5 text-[13px]" style={{ color: C.muted }}>
        Match each word to its meaning.
      </div>
      <div className="grid grid-cols-2 gap-2.5">
        <div className="flex flex-col gap-2.5">
          {left.map((w, i) => (
            <button
              key={w.word}
              disabled={done.has(w.word)}
              onClick={() => setSelL(i)}
              className={`rounded-xl border py-4 text-center transition-colors ${lang === "ja" ? "font-jp text-[22px]" : "text-base font-semibold"}`}
              style={styleOf(w.word, selL === i)}
            >
              {w.word}
            </button>
          ))}
        </div>
        <div className="flex flex-col gap-2.5">
          {right.map((w, i) => (
            <motion.button
              key={w.word}
              animate={shake === i ? { x: [0, -6, 6, -4, 0] } : {}}
              disabled={done.has(w.word)}
              onClick={() => tryMatch(i)}
              className="rounded-xl border py-4 text-center text-[15px] font-semibold transition-colors"
              style={styleOf(w.word, false)}
            >
              {w.meaning}
            </motion.button>
          ))}
        </div>
      </div>
      <div className="flex-1" />
      {complete && (
        <motion.div
          initial={{ y: 12, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="mb-3 rounded-xl px-4 py-3 text-sm font-semibold"
          style={{ background: "rgba(72,199,142,0.12)", color: C.green }}
        >
          All matched — nicely done.
        </motion.div>
      )}
      <button
        className="w-full rounded-full py-4 text-[15px] font-bold transition-colors"
        style={{ background: complete ? C.red : C.disabled, color: complete ? "#fff" : C.dim }}
        disabled={!complete}
        onClick={() => onNext(true)}
      >
        Continue
      </button>
    </>
  );
}
