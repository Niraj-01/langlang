"use client";

import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import type { AppState } from "@/lib/types";
import { levelFromXp, petMood, setLang, toggleFurigana, toggleSound } from "@/lib/store";
import { Pet } from "./Pet";

export function Hud({ state, combo, multiplier }: { state: AppState; combo: number; multiplier: number }) {
  const { level } = levelFromXp(state.xp);
  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-20 flex flex-col gap-1.5 p-3">
      <div className="flex items-start justify-between gap-2">
        <Link
          href="/profile"
          className="hud-chip pointer-events-auto gap-1"
          aria-label={`Profile — level ${level}, ${state.streak.current} day streak`}
          title="Your profile"
        >
          <span className="-my-1">
            <Pet xp={state.xp} mood={petMood(state)} equipped={state.pet.equipped} size={30} />
          </span>
          <span className="font-display text-xs opacity-60">LV</span>
          <span className="font-display">{level}</span>
          <span className={state.streak.current > 0 ? "" : "grayscale opacity-50"}>🔥</span>
          <span className="font-display">{state.streak.current}</span>
          {state.packs > 0 && (
            <span className="ml-1 font-display text-yellow-300">🎴{state.packs}</span>
          )}
        </Link>

        <div
          className="pointer-events-auto flex items-center"
          role="group"
          aria-label="Language"
        >
          <button
            className={`hud-chip font-display ${state.lang === "ja" ? "border-(--accent) text-(--accent)" : "opacity-50"}`}
            onClick={() => setLang("ja")}
            aria-pressed={state.lang === "ja"}
            aria-label="Learn Japanese"
            title="Learn Japanese"
          >
            🇯🇵 JA
          </button>
          <button
            className={`hud-chip -ml-0.5 font-display ${state.lang === "de" ? "border-(--accent) text-(--accent)" : "opacity-50"}`}
            onClick={() => setLang("de")}
            aria-pressed={state.lang === "de"}
            aria-label="Learn German"
            title="Learn German"
          >
            🇩🇪 DE
          </button>
        </div>
      </div>

      <nav className="pointer-events-auto flex items-center justify-end gap-1.5" aria-label="Feed menu">
        <Link href="/learn" className="hud-chip hud-chip-labeled" title="Home dashboard">
          <span aria-hidden>🏠</span>
          <span className="hud-label">Home</span>
        </Link>
        <Link href="/dojo" className="hud-chip hud-chip-labeled" title="Conversation Dojo — AI chat practice">
          <span aria-hidden>⛩️</span>
          <span className="hud-label">Dojo</span>
        </Link>
        <Link href="/path" className="hud-chip hud-chip-labeled" title="The Path — units & streak">
          <span aria-hidden>🗺️</span>
          <span className="hud-label">Path</span>
        </Link>
        {state.lang === "ja" && (
          <button
            className={`hud-chip hud-chip-labeled ${state.furigana ? "text-(--accent)" : "opacity-50"}`}
            onClick={toggleFurigana}
            aria-pressed={state.furigana}
            aria-label={`Furigana reading hints ${state.furigana ? "on" : "off"}`}
            title="Furigana reading hints"
          >
            <span aria-hidden>あ</span>
            <span className="hud-label">Furigana</span>
          </button>
        )}
        <button
          className={`hud-chip hud-chip-labeled ${state.sound ? "" : "opacity-50"}`}
          onClick={toggleSound}
          aria-pressed={state.sound}
          aria-label={`Sound ${state.sound ? "on" : "off"}`}
          title="Sound effects"
        >
          <span aria-hidden>{state.sound ? "🔊" : "🔇"}</span>
          <span className="hud-label">Sound</span>
        </button>
      </nav>

      <AnimatePresence>
        {combo >= 2 && (
          <motion.div
            key={combo}
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: [1.3, 1], opacity: 1 }}
            exit={{ scale: 0.6, opacity: 0 }}
            className="hud-chip absolute left-1/2 top-24 -translate-x-1/2 border-(--accent) text-(--accent)"
          >
            <span className="font-display">×{multiplier}</span>
            <span className="text-[10px] opacity-80">{combo} COMBO</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
