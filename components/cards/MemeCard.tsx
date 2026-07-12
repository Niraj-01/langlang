"use client";

// Meme card — brainrot as pedagogy. Shows a local template instantly (feed
// never blocks), then quietly swaps in a fresher Claude meme when reachable.
// Tap a reaction to advance; save the word to your deck.

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import type { Lang } from "@/lib/types";
import { awardXp } from "@/lib/store";
import { speak as tts, sfxAdd, sfxCorrect } from "@/lib/audio";
import { burst } from "@/lib/confetti";
import { Icon, type IconName } from "@/components/Icon";
import { XpPop } from "./XpPop";

function localMeme(word: string, meaning: string): string {
  const templates = [
    `nobody:\n\nme at 3am:\n「${word}」`,
    `POV: you finally get that\n${word} = "${meaning}"`,
    `${word} living rent-free\nin my head rn`,
    `my toxic trait:\nusing ${word}\nin every sentence`,
    `it's giving...\n${word}`,
    `not me flexing that\n${word} means "${meaning}"`,
  ];
  let h = 0;
  for (let i = 0; i < word.length; i++) h = (h * 31 + word.charCodeAt(i)) >>> 0;
  return templates[h % templates.length];
}

const CACHE_PREFIX = "langlang.meme.";

export function MemeCard({
  lang,
  word,
  reading,
  meaning,
  furigana,
  combo,
  onAnswered,
}: {
  lang: Lang;
  word: string;
  reading?: string;
  meaning: string;
  furigana: boolean;
  combo: number;
  onAnswered: (correct: boolean) => void;
}) {
  const [meme, setMeme] = useState(() => localMeme(word, meaning));
  const [reacted, setReacted] = useState(false);
  const [xp, setXp] = useState<number | null>(null);
  const cacheKey = `${CACHE_PREFIX}${lang}:${word}`;

  useEffect(() => {
    if (typeof window === "undefined") return;
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      setMeme(cached);
      return;
    }
    let alive = true;
    fetch("/api/meme", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ lang, word, meaning }),
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        if (alive && j?.meme) {
          setMeme(j.meme);
          try {
            localStorage.setItem(cacheKey, j.meme);
          } catch {
            /* storage full */
          }
        }
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [cacheKey, lang, word, meaning]);

  const react = (e: React.MouseEvent) => {
    if (reacted) return;
    setReacted(true);
    const earned = 5;
    awardXp(earned);
    setXp(earned);
    sfxCorrect(combo);
    burst(e.clientX, e.clientY, ["#ffd400", "#ff3b1f", "#ffffff"], 40);
    onAnswered(true);
  };

  return (
    <div className="card-shell">
      <div className="card-panel">
        <div className="tag">MEME · {meaning.toUpperCase()}</div>

        <button
          className="flex flex-1 flex-col items-center justify-center gap-4 text-center"
          onClick={() => tts(word, lang)}
        >
          <div className="whitespace-pre-line font-display text-3xl leading-snug">
            {meme}
          </div>
          <div
            className={`mt-4 rounded-full border-2 border-line px-4 py-1 text-2xl ${lang === "ja" ? "font-jp" : ""}`}
          >
            {word}
            {lang === "ja" && furigana && reading && (
              <span className="font-jp ml-2 text-sm opacity-50">{reading}</span>
            )}
          </div>
        </button>

        {!reacted ? (
          <div className="grid grid-cols-3 gap-3">
            {(["flame", "star", "bolt"] as IconName[]).map((icon) => (
              <motion.button
                key={icon}
                whileTap={{ scale: 0.85 }}
                className="flex items-center justify-center border-4 border-line bg-black/30 py-4 text-(--accent)"
                onClick={react}
                aria-label="React"
              >
                <Icon name={icon} size={28} />
              </motion.button>
            ))}
          </div>
        ) : (
          <button
            className="btn-ghost"
            onClick={(e) => {
              e.stopPropagation();
              sfxAdd();
            }}
          >
            already know it — scroll on ↑
          </button>
        )}
      </div>
      <XpPop amount={xp} />
    </div>
  );
}
