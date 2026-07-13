"use client";

// Grammar drill: fill the ＿ blank with the right particle (ja) or
// article/case (de). Teaches the pattern, not just the word — the "why" note
// shows after you answer.

import { useState } from "react";
import { motion } from "framer-motion";
import type { GrammarItem } from "@/lib/types";
import { awardXp } from "@/lib/store";
import { speak, sfxCorrect, sfxWrong } from "@/lib/audio";
import { burst } from "@/lib/confetti";
import { Icon } from "@/components/Icon";
import { XpPop } from "./XpPop";

const BLANK = "＿";

export function GrammarCard({
  item,
  furigana,
  combo,
  multiplier,
  onAnswered,
}: {
  item: GrammarItem;
  furigana: boolean;
  combo: number;
  multiplier: number;
  onAnswered: (correct: boolean) => void;
}) {
  const [picked, setPicked] = useState<number | null>(null);
  const [xp, setXp] = useState<number | null>(null);

  // the sentence with the blank filled by the current pick (or a box while empty)
  const filled = (opt: string | null) =>
    (picked !== null ? item.prompt.replace(BLANK, item.options[picked]) : item.prompt.replace(BLANK, opt ?? "▢"));

  const pick = (i: number, e: React.MouseEvent) => {
    if (picked !== null) return;
    setPicked(i);
    const correct = i === item.answer;
    if (correct) {
      const earned = 10 * multiplier;
      awardXp(earned);
      setXp(earned);
      sfxCorrect(combo);
      burst(e.clientX, e.clientY, undefined, 50);
    } else {
      sfxWrong();
    }
    // read the correct, fully-formed sentence aloud
    speak(item.prompt.replace(BLANK, item.options[item.answer]), item.lang);
    onAnswered(correct);
  };

  return (
    <div className="card-shell">
      <motion.div
        className="card-panel"
        animate={picked !== null && picked !== item.answer ? { x: [0, -12, 12, -8, 8, 0] } : {}}
        transition={{ duration: 0.4 }}
      >
        <div className="tag">
          GRAMMAR <span className="opacity-50">· {item.lang === "ja" ? "particle" : "article"}</span>
        </div>

        <div className="flex flex-1 flex-col items-center justify-center text-center">
          <div className={`font-bold ${item.lang === "ja" ? "text-4xl leading-relaxed" : "text-3xl leading-snug"}`}>
            {filled(null)}
          </div>
          {item.lang === "ja" && furigana && item.promptReading && (
            <div className="mt-2 text-lg opacity-60">
              {picked !== null
                ? item.promptReading.replace(BLANK, item.options[picked])
                : item.promptReading.replace(BLANK, "▢")}
            </div>
          )}
          <div className="mt-4 text-sm opacity-50">{item.translation}</div>
          <div className="mt-3 text-xs uppercase tracking-[0.3em] opacity-40">fill the blank</div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {item.options.map((opt, i) => {
            let cls = "btn-option";
            if (picked !== null) {
              if (i === item.answer) cls += " correct";
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
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-3 flex items-start justify-center gap-2 rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-center text-sm leading-snug opacity-80"
          >
            <Icon name={picked === item.answer ? "check" : "bulb"} size={15} className="mt-0.5 shrink-0 text-(--accent)" />
            <span>{item.note}</span>
          </motion.div>
        )}
      </motion.div>
      <XpPop amount={xp} />
    </div>
  );
}
