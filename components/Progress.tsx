"use client";

// Test tracker: pick a target exam + date, watch coverage bars fill as words
// reach FSRS mastery, and get a nightly-recalculated pace forecast.

import { useState } from "react";
import Link from "next/link";
import {
  useApp,
  masteredCount,
  activeVocab,
  setTarget,
  clearTarget,
  paceForecast,
  logRange,
} from "@/lib/store";
import { EXAMS_BY_LANG, EXAM_LABEL, EXAM_VOCAB_TOTAL } from "@/lib/exams";
import type { Exam } from "@/lib/types";

function fmtDate(d: string): string {
  return new Date(d + "T00:00:00").toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function Progress() {
  const state = useApp();
  const lang = state.lang;
  const accent = lang === "ja" ? "lang-ja" : "lang-de";
  const exams = EXAMS_BY_LANG[lang];
  const target = state.targets[lang];
  const mastered = masteredCount(state, lang);
  const active = activeVocab(state, lang);

  const [pickExam, setPickExam] = useState<Exam>(target?.exam ?? exams[0]);
  const [pickDate, setPickDate] = useState(
    target?.date ?? todayPlus(90)
  );

  const week = logRange(state, 7);
  const maxXp = Math.max(1, ...week.map((d) => d.stats.xp));

  return (
    <div className={`${accent} min-h-dvh bg-bg pb-10`}>
      <div className="flex items-center justify-between border-b-2 border-line p-3">
        <Link href="/" className="hud-chip">
          ← FEED
        </Link>
        <div className="font-display text-sm uppercase tracking-[0.3em] text-(--accent)">
          Progress
        </div>
        <Link href="/profile" className="hud-chip">
          👤
        </Link>
      </div>

      {/* target picker */}
      <div className="p-4">
        <div className="mb-2 font-display text-xs uppercase tracking-[0.3em] opacity-60">
          Your Target
        </div>
        <div className="border-2 border-line bg-panel p-4">
          <div className="grid grid-cols-2 gap-2">
            <select
              className="border-2 border-line bg-black/30 px-2 py-2 outline-none focus:border-(--accent)"
              value={pickExam}
              onChange={(e) => setPickExam(e.target.value as Exam)}
            >
              {exams.map((e) => (
                <option key={e} value={e}>
                  {EXAM_LABEL[e]}
                </option>
              ))}
            </select>
            <input
              type="date"
              className="border-2 border-line bg-black/30 px-2 py-2 outline-none focus:border-(--accent)"
              value={pickDate}
              onChange={(e) => setPickDate(e.target.value)}
            />
          </div>
          <button
            className="btn-primary mt-3 w-full"
            onClick={() => setTarget(lang, pickExam, pickDate)}
          >
            {target ? "UPDATE TARGET" : "SET TARGET"}
          </button>
          {target && (
            <button
              className="mt-2 w-full text-xs uppercase tracking-widest opacity-50"
              onClick={() => clearTarget(lang)}
            >
              clear target
            </button>
          )}
        </div>
      </div>

      {/* forecast for the active target */}
      {target && (
        <Forecast state={state} lang={lang} />
      )}

      {/* coverage ladder */}
      <div className="px-4 pt-2">
        <div className="mb-2 font-display text-xs uppercase tracking-[0.3em] opacity-60">
          Coverage
        </div>
        <div className="space-y-3">
          {exams.map((e) => {
            const total = EXAM_VOCAB_TOTAL[e];
            const pct = Math.min(100, (mastered / total) * 100);
            const isTarget = target?.exam === e;
            return (
              <div key={e}>
                <div className="mb-1 flex justify-between text-sm">
                  <span className={isTarget ? "text-(--accent)" : ""}>
                    {isTarget ? "🎯 " : ""}
                    {EXAM_LABEL[e]}
                  </span>
                  <span className="opacity-60">
                    {mastered}/{total} mastered
                  </span>
                </div>
                <div className="h-3 w-full border-2 border-line bg-black/40">
                  <div
                    className={`h-full ${isTarget ? "bg-(--accent)" : "bg-good/70"}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
        <div className="mt-2 text-[10px] uppercase tracking-widest opacity-40">
          mastered = FSRS stability ≥ 21 days · {active} words in your {lang === "ja" ? "Japanese" : "German"} deck
        </div>
      </div>

      {/* 7-day activity */}
      <div className="px-4 pt-6">
        <div className="mb-2 font-display text-xs uppercase tracking-[0.3em] opacity-60">
          Last 7 Days
        </div>
        <div className="flex h-24 items-end justify-between gap-1 border-2 border-line bg-panel p-3">
          {last7(state).map((d) => (
            <div key={d.date} className="flex flex-1 flex-col items-center gap-1">
              <div
                className="w-full bg-(--accent)"
                style={{ height: `${Math.max(3, (d.xp / maxXp) * 60)}px` }}
                title={`${d.xp} XP`}
              />
              <div className="text-[8px] uppercase opacity-40">{d.label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Forecast({ state, lang }: { state: ReturnType<typeof useApp>; lang: "ja" | "de" }) {
  const target = state.targets[lang]!;
  const total = EXAM_VOCAB_TOTAL[target.exam];
  const { rate, date } = paceForecast(state, lang, total);
  const daysToExam = Math.round(
    (new Date(target.date + "T00:00:00").getTime() - Date.now()) / 86400000
  );
  const onTrack = date && new Date(date) <= new Date(target.date + "T00:00:00");

  return (
    <div className="px-4">
      <div className="border-2 border-(--accent) bg-panel p-4">
        <div className="text-xs uppercase tracking-widest opacity-60">
          {EXAM_LABEL[target.exam]} · exam {fmtDate(target.date)} ({daysToExam}d)
        </div>
        <div className="mt-2 font-display text-lg">
          {date
            ? `At ${rate.toFixed(1)} words/day, ${EXAM_LABEL[target.exam]}-ready by ${fmtDate(date)}`
            : "Learn a few more words to project a date"}
        </div>
        {date && (
          <div className={`mt-1 text-sm ${onTrack ? "text-good" : "text-bad"}`}>
            {onTrack ? "✓ on track for exam day" : "⚡ behind pace — pick it up"}
          </div>
        )}
      </div>
    </div>
  );
}

function last7(state: ReturnType<typeof useApp>) {
  const days = logRange(state, 7);
  const byDate = new Map(days.map((d) => [d.date, d.stats.xp]));
  const out: { date: string; label: string; xp: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const dt = new Date(Date.now() - i * 86400000);
    const date = todayPlus(0, dt);
    out.push({
      date,
      label: dt.toLocaleDateString("en-US", { weekday: "short" })[0],
      xp: byDate.get(date) ?? 0,
    });
  }
  return out;
}

function todayPlus(days: number, base = new Date()): string {
  const d = new Date(base.getTime() + days * 86400000);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}
