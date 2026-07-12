"use client";

// Listening drill: audio plays on arrival, you pick which word you heard.
// Trains the ear with no keyboard friction (works for kana and German alike).

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import type { Card } from "@/lib/types";
import { awardXp } from "@/lib/store";
import { speak, sfxCorrect, sfxWrong } from "@/lib/audio";
import { burst } from "@/lib/confetti";
import { JaWord } from "@/components/Lex";

export function ListenCard({
  card,
  options,
  answer,
  furigana,
  combo,
  multiplier,
  onAnswered,
}: {
  card: Card;
  options: string[];
  answer: number;
  furigana: boolean;
  combo: number;
  multiplier: number;
  onAnswered: (correct: boolean) => void;
}) {
  const [picked, setPicked] = useState<number | null>(null);
  const played = useRef(false);

  const say = () => speak(card.word, card.lang);

  // auto-play once when the card mounts (i.e. scrolls into the queue)
  useEffect(() => {
    if (played.current) return;
    played.current = true;
    const t = setTimeout(say, 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pick = (i: number, e: React.MouseEvent) => {
    if (picked !== null) return;
    setPicked(i);
    const correct = i === answer;
    if (correct) {
      awardXp(10 * multiplier);
      sfxCorrect(combo);
      burst(e.clientX, e.clientY, undefined, 50);
    } else {
      sfxWrong();
    }
    say();
    onAnswered(correct);
  };

  return (
    <div className="card-shell">
      <motion.div
        className="card-panel"
        animate={picked !== null && picked !== answer ? { x: [0, -12, 12, -8, 8, 0] } : {}}
        transition={{ duration: 0.4 }}
      >
        <div className="tag">
          LISTEN <span className="opacity-50">· which word?</span>
        </div>

        <div className="flex flex-1 flex-col items-center justify-center text-center">
          <button
            onClick={say}
            className="press flex h-28 w-28 items-center justify-center rounded-full border-2 border-(--accent) text-6xl text-(--accent)"
            aria-label="Play audio again"
          >
            🔊
          </button>
          <div className="mt-4 text-xs uppercase tracking-[0.3em] opacity-40">
            tap to replay · pick what you heard
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {options.map((opt, i) => {
            let cls = "btn-option";
            if (picked !== null) {
              if (i === answer) cls += " correct";
              else if (i === picked) cls += " wrong";
              else cls += " opacity-40";
            }
            return (
              <motion.button
                key={i}
                whileTap={picked === null ? { scale: 0.96 } : {}}
                className={cls}
                onClick={(e) => pick(i, e)}
              >
                {card.lang === "ja" ? (
                  <JaWord
                    word={opt}
                    reading={picked !== null && furigana ? card.reading : undefined}
                    furigana={picked !== null && furigana && opt === card.word}
                    className="text-2xl"
                  />
                ) : (
                  opt
                )}
              </motion.button>
            );
          })}
        </div>

        {picked !== null && (
          <div className="mt-3 text-center text-sm opacity-60">
            {picked === answer ? "✓ " : "💡 "}
            <span className="font-semibold">{card.word}</span> — {card.meaning}
          </div>
        )}
      </motion.div>
    </div>
  );
}
