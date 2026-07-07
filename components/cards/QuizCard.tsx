"use client";

// 5-second quiz: tap the meaning, get instant juice.

import { useState } from "react";
import { motion } from "framer-motion";
import type { Card } from "@/lib/types";
import { awardXp } from "@/lib/store";
import { speak, sfxCorrect, sfxWrong, sfxBonus } from "@/lib/audio";
import { burst } from "@/lib/confetti";
import { JaWord } from "@/components/Lex";
import { XpPop } from "./XpPop";

export function QuizCard({
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
  const [xp, setXp] = useState<number | null>(null);
  const [bonus, setBonus] = useState(false);

  const pick = (i: number, e: React.MouseEvent) => {
    if (picked !== null) return;
    setPicked(i);
    const correct = i === answer;
    if (correct) {
      // variable-ratio reward: sometimes the win pays double
      const isBonus = Math.random() < 0.12;
      const earned = 10 * multiplier * (isBonus ? 2 : 1);
      awardXp(earned);
      setXp(earned);
      setBonus(isBonus);
      if (isBonus) sfxBonus();
      else sfxCorrect(combo);
      burst(e.clientX, e.clientY, undefined, isBonus ? 120 : 50);
    } else {
      sfxWrong();
      speak(card.word, card.lang);
    }
    onAnswered(correct);
  };

  return (
    <div className="card-shell">
      <motion.div
        className="card-panel"
        animate={
          picked !== null && picked !== answer
            ? { x: [0, -12, 12, -8, 8, 0] }
            : {}
        }
        transition={{ duration: 0.4 }}
      >
        <div className="tag">QUICK QUIZ</div>

        <div className="flex flex-1 flex-col items-center justify-center text-center">
          <button onClick={() => speak(card.word, card.lang)}>
            {card.lang === "ja" ? (
              <JaWord
                word={card.word}
                reading={card.reading}
                furigana={furigana && picked !== null}
                className="text-6xl font-bold"
              />
            ) : (
              <span className="text-5xl font-bold">{card.word}</span>
            )}
          </button>
          <div className="mt-4 text-xs uppercase tracking-[0.3em] opacity-40">
            what does it mean?
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3">
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
                {opt}
              </motion.button>
            );
          })}
        </div>

        {picked !== null && (
          <div className="mt-3 text-center text-sm uppercase tracking-[0.3em] opacity-50">
            {picked === answer ? "clean hit ↑" : "it happens — scroll on ↑"}
          </div>
        )}
      </motion.div>
      <XpPop amount={xp} bonus={bonus} />
    </div>
  );
}
