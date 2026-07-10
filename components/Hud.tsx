"use client";

import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import type { AppState } from "@/lib/types";
import { levelFromXp, petMood, setLang, toggleFurigana, toggleSound } from "@/lib/store";
import { Pet } from "./Pet";

export function Hud({ state, combo, multiplier }: { state: AppState; combo: number; multiplier: number }) {
  const { level } = levelFromXp(state.xp);
  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-20 flex items-start justify-between gap-2 p-3">
      <Link href="/profile" className="hud-chip pointer-events-auto gap-0.5!" title="Your pet & profile">
        <span className="-my-1">
          <Pet xp={state.xp} mood={petMood(state)} equipped={state.pet.equipped} size={30} />
        </span>
        <span className={state.streak.current > 0 ? "" : "grayscale opacity-50"}>🔥</span>
        <span className="font-display">{state.streak.current}</span>
        {state.packs > 0 && (
          <span className="ml-1 font-display text-yellow-300">🎴{state.packs}</span>
        )}
      </Link>

      <AnimatePresence>
        {combo >= 2 && (
          <motion.div
            key={combo}
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: [1.3, 1], opacity: 1 }}
            exit={{ scale: 0.6, opacity: 0 }}
            className="hud-chip absolute left-1/2 top-14 -translate-x-1/2 border-(--accent) text-(--accent)"
          >
            <span className="font-display">×{multiplier}</span>
            <span className="text-[10px] opacity-80">{combo} COMBO</span>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="pointer-events-auto flex items-center gap-1.5">
        <Link href="/learn" className="hud-chip font-jp" title="Back to Home dashboard">
          ホ
        </Link>
        <Link href="/dojo" className="hud-chip" title="Conversation Dojo">
          ⛩
        </Link>
        <Link href="/path" className="hud-chip" title="The Path — units & streak">
          🗺
        </Link>
        <div className="hud-chip">
          <span className="text-xs opacity-60">LV</span>
          <span className="font-display">{level}</span>
        </div>
        {state.lang === "ja" && (
          <button
            className={`hud-chip ${state.furigana ? "text-(--accent)" : "opacity-50"}`}
            onClick={toggleFurigana}
            title="furigana"
          >
            あ
          </button>
        )}
        <button
          className={`hud-chip ${state.sound ? "" : "opacity-50"}`}
          onClick={toggleSound}
          title="sound"
        >
          {state.sound ? "♪" : "✕"}
        </button>
        <button
          className="hud-chip font-display text-(--accent)"
          onClick={() => setLang(state.lang === "ja" ? "de" : "ja")}
          title="switch language"
        >
          {state.lang === "ja" ? "日" : "DE"}
        </button>
      </div>
    </div>
  );
}
