"use client";

// First-run onboarding — implements the "Onboarding & Lesson" design flow:
// splash → welcome → why → level → daily goal → start point, one question per
// screen, red progress + primary action, no streak pressure. Answers are saved
// via completeOnboarding; "Start learning" drops straight into Unit 1.

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { completeOnboarding } from "@/lib/store";
import { speak as tts } from "@/lib/audio";

// Design palette (calmer than the feed's arcade brutalism — scoped to this flow)
const C = {
  bg: "#0f1115",
  panel: "#171a21",
  line: "#2b303b",
  red: "#ff5a5f",
  blue: "#4aa8ff",
  muted: "#9aa3b2",
  dim: "#5b6472",
  disabled: "#1f232c",
  text: "#f2f4f8",
};

const WHY = [
  { id: "travel", g: "旅", t: "Travel to Japan" },
  { id: "fun", g: "楽", t: "Anime, music & films" },
  { id: "work", g: "仕", t: "Work or study" },
  { id: "curious", g: "心", t: "Just curious" },
];

const LEVEL = [
  { id: "new", t: "I’m brand new", d: "Perfect — that’s who this app is for" },
  { id: "kana", t: "I know some kana", d: "We’ll fill the gaps" },
  { id: "words", t: "I know kana and some words", d: "We’ll move a little faster" },
  { id: "conversations", t: "I can have simple conversations", d: "We’ll find your level" },
];

const GOAL = [
  { min: 5, t: "5 min / day", d: "Gentle" },
  { min: 10, t: "10 min / day", d: "Steady" },
  { min: 15, t: "15 min / day", d: "Focused" },
  { min: 20, t: "20 min / day", d: "Committed" },
];

const START = [
  {
    id: "scratch" as const,
    g: "あ",
    t: "Start from scratch",
    d: "Begin with the very first hiragana",
    rec: true,
  },
  {
    id: "placement" as const,
    g: "級",
    t: "Find my level",
    d: "A short check places you in the right spot",
    rec: false,
  },
];

const STEPS = 6;
const PROGRESS = [0, 8, 25, 45, 65, 85];

export function Onboarding() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [why, setWhy] = useState<number | null>(null);
  const [lvl, setLvl] = useState<number | null>(null);
  const [goal, setGoal] = useState<number | null>(null);
  const [start, setStart] = useState(0);

  const finish = () => {
    completeOnboarding({
      why: why != null ? WHY[why].id : undefined,
      level: lvl != null ? LEVEL[lvl].id : undefined,
      minutes: goal != null ? GOAL[goal].min : undefined,
      start: START[start].id,
    });
    // placement test is a later phase — both paths begin at Unit 1 for now
    router.push("/lesson?unit=0");
  };

  const next = () => (step + 1 >= STEPS ? finish() : setStep(step + 1));
  const back = () => (step === 0 ? router.push("/") : setStep(step - 1));

  return (
    <div
      className="flex h-dvh flex-col"
      style={{ background: step === 0 ? C.red : C.bg, color: C.text }}
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -24 }}
          transition={{ duration: 0.2 }}
          className="mx-auto flex h-full w-full max-w-md flex-col px-6 pt-7 pb-10"
        >
          {step === 0 && <Splash onNext={next} />}
          {step > 0 && (
            <TopBar pct={PROGRESS[step]} onBack={back} />
          )}
          {step === 1 && (
            <>
              <div className="flex flex-1 flex-col items-center justify-center gap-5 text-center">
                <span className="font-jp text-6xl" style={{ color: C.red }}>
                  こ
                </span>
                <div className="max-w-70 text-[22px] leading-snug font-bold">
                  Just 5 quick questions before your first lesson.
                </div>
                <div className="max-w-65 text-sm" style={{ color: C.muted }}>
                  No prior Japanese needed — readings are always shown in English letters.
                </div>
              </div>
              <Pill label="Continue" enabled onClick={next} />
            </>
          )}
          {step === 2 && (
            <>
              <Question glyph="何" text="Why are you learning Japanese?" />
              <div className="flex flex-col gap-2.5">
                {WHY.map((o, i) => (
                  <Option key={o.id} selected={why === i} onClick={() => setWhy(i)}>
                    <span className="font-jp text-xl" style={{ color: C.muted }}>
                      {o.g}
                    </span>
                    <span className="text-[15px] font-semibold">{o.t}</span>
                  </Option>
                ))}
              </div>
              <div className="flex-1" />
              <Pill label="Continue" enabled={why != null} onClick={next} />
            </>
          )}
          {step === 3 && (
            <>
              <Question glyph="学" text="How much Japanese do you know?" />
              <div className="flex flex-col gap-2.5">
                {LEVEL.map((o, i) => (
                  <Option key={o.id} selected={lvl === i} onClick={() => setLvl(i)} column>
                    <span className="text-[15px] font-semibold">{o.t}</span>
                    <span className="text-xs" style={{ color: C.muted }}>
                      {o.d}
                    </span>
                  </Option>
                ))}
              </div>
              <div className="flex-1" />
              <Pill label="Continue" enabled={lvl != null} onClick={next} />
            </>
          )}
          {step === 4 && (
            <>
              <Question glyph="日" text="A few minutes a day is plenty." />
              <div className="flex flex-col gap-2.5">
                {GOAL.map((o, i) => (
                  <Option key={o.min} selected={goal === i} onClick={() => setGoal(i)} spread>
                    <span className="text-[15px] font-semibold">{o.t}</span>
                    <span className="text-xs" style={{ color: C.muted }}>
                      {o.d}
                    </span>
                  </Option>
                ))}
              </div>
              <div className="mt-4 text-xs" style={{ color: C.muted }}>
                You can change this any time. No streaks, no guilt.
              </div>
              <div className="flex-1" />
              <Pill label="Continue" enabled={goal != null} onClick={next} />
            </>
          )}
          {step === 5 && (
            <>
              <Question glyph="始" text="Where would you like to start?" />
              <div className="flex flex-col gap-2.5">
                {START.map((o, i) => {
                  const sel = start === i;
                  return (
                    <button
                      key={o.id}
                      onClick={() => setStart(i)}
                      className="relative rounded-xl border p-4.5 text-left transition-colors"
                      style={{
                        borderColor: sel ? C.blue : C.line,
                        background: sel ? "rgba(74,168,255,0.08)" : C.panel,
                      }}
                    >
                      {o.rec && (
                        <span
                          className="absolute -top-2 right-3.5 rounded-full px-2.5 py-0.5 text-[9px] font-bold tracking-[1.5px] uppercase"
                          style={{ background: C.blue, color: C.bg }}
                        >
                          Recommended
                        </span>
                      )}
                      <span className="flex items-center gap-3.5">
                        <span
                          className="font-jp text-[28px]"
                          style={{ color: sel ? C.blue : C.text }}
                        >
                          {o.g}
                        </span>
                        <span>
                          <span
                            className="block text-[15px] font-bold"
                            style={{ color: sel ? C.blue : C.text }}
                          >
                            {o.t}
                          </span>
                          <span className="mt-0.5 block text-xs" style={{ color: C.muted }}>
                            {o.d}
                          </span>
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
              <div className="flex-1" />
              <Pill label="Start learning" enabled onClick={next} />
            </>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

function Splash({ onNext }: { onNext: () => void }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-between pt-10">
      <div />
      <div className="text-center">
        <button
          className="font-jp text-[120px] leading-none font-medium text-white"
          onClick={() => tts("あ", "ja")}
          aria-label="Hear あ"
        >
          あ
        </button>
        <div className="mt-5 text-[32px] font-bold tracking-tight text-white">langlang</div>
        <div className="mt-2 text-[15px] text-white/85">Japanese for absolute beginners</div>
      </div>
      <button
        className="w-full rounded-full bg-white py-4 text-[15px] font-bold"
        style={{ color: C.red }}
        onClick={onNext}
      >
        Get started
      </button>
    </div>
  );
}

function TopBar({ pct, onBack }: { pct: number; onBack: () => void }) {
  return (
    <div className="mb-7 flex items-center gap-3.5">
      <button className="text-xl" style={{ color: C.muted }} onClick={onBack} aria-label="Back">
        ←
      </button>
      <div className="h-1.5 flex-1 rounded-full" style={{ background: C.line }}>
        <div
          className="h-1.5 rounded-full transition-all duration-300"
          style={{ width: `${pct}%`, background: C.red }}
        />
      </div>
    </div>
  );
}

function Question({ glyph, text }: { glyph: string; text: string }) {
  return (
    <div className="mb-6 flex items-center gap-3.5">
      <span className="font-jp text-[34px] font-medium" style={{ color: C.red }}>
        {glyph}
      </span>
      <div className="text-[19px] font-bold">{text}</div>
    </div>
  );
}

function Option({
  children,
  selected,
  onClick,
  column,
  spread,
}: {
  children: React.ReactNode;
  selected: boolean;
  onClick: () => void;
  column?: boolean;
  spread?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-xl border px-4.5 py-4 text-left transition-colors ${
        column ? "flex flex-col gap-0.5" : spread ? "flex items-center justify-between" : "flex items-center gap-3"
      }`}
      style={{
        borderColor: selected ? C.red : C.line,
        background: selected ? "rgba(255,90,95,0.1)" : C.panel,
        color: selected ? C.red : C.text,
      }}
    >
      {children}
    </button>
  );
}

function Pill({
  label,
  enabled,
  onClick,
}: {
  label: string;
  enabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      className="w-full rounded-full py-4 text-[15px] font-bold transition-colors"
      style={{
        background: enabled ? C.red : C.disabled,
        color: enabled ? "#fff" : C.dim,
      }}
      disabled={!enabled}
      onClick={onClick}
    >
      {label}
    </button>
  );
}
