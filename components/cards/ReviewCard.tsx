"use client";

// Due FSRS card disguised as content: tap to flip, then grade.
// Swipe the revealed card left = again, right = good; buttons always work.

import { useState } from "react";
import { motion } from "framer-motion";
import type { Card, Rating } from "@/lib/types";
import { rateCard } from "@/lib/store";
import { sfxFlip, sfxCorrect, sfxWrong } from "@/lib/audio";
import { playWord } from "@/lib/nativeAudio";
import { burst } from "@/lib/confetti";
import { JaWord, DeNoun, DePlural, Example } from "@/components/Lex";
import { Icon } from "@/components/Icon";
import { XpPop } from "./XpPop";

export function ReviewCard({
  card,
  furigana,
  combo,
  multiplier,
  onAnswered,
}: {
  card: Card;
  furigana: boolean;
  combo: number;
  multiplier: number;
  onAnswered: (correct: boolean) => void;
}) {
  const [revealed, setRevealed] = useState(false);
  const [rated, setRated] = useState<Rating | null>(null);
  const [xp, setXp] = useState<number | null>(null);

  const flip = () => {
    if (revealed) return;
    setRevealed(true);
    sfxFlip();
    playWord(card.word, card.lang);
  };

  const grade = (rating: Rating, e?: React.MouseEvent) => {
    if (rated !== null) return;
    setRated(rating);
    const earned = rateCard(card.id, rating, multiplier);
    setXp(earned);
    const correct = rating >= 3;
    if (correct) {
      sfxCorrect(combo);
      burst(
        e ? e.clientX : innerWidth / 2,
        e ? e.clientY : innerHeight / 2,
        undefined,
        rating === 4 ? 90 : 50
      );
    } else {
      sfxWrong();
    }
    onAnswered(correct);
  };

  return (
    <div className="card-shell">
      <motion.div
        className={`card-panel ${card.isGolden ? "golden" : ""}`}
        drag={revealed && rated === null ? "x" : false}
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.6}
        onDragEnd={(_, info) => {
          if (info.offset.x < -90) grade(1);
          else if (info.offset.x > 90) grade(3);
        }}
        animate={rated !== null ? { scale: [1, 1.04, 1] } : {}}
        onClick={flip}
      >
        <div className="tag">
          REVIEW {card.isGolden && <span className="inline-flex items-center gap-1 text-yellow-300"><Icon name="star" size={13} /> GOLDEN</span>}
        </div>

        <div className="flex flex-1 flex-col items-center justify-center text-center">
          {card.lang === "ja" ? (
            <JaWord
              word={card.word}
              furigana={false}
              className="glyph-float block text-8xl font-bold leading-none"
            />
          ) : (
            <div className="text-6xl font-bold">
              {revealed ? <DeNoun entry={card} /> : card.word}
            </div>
          )}
          {/* reading revealed on flip, as a blue line (design), honoring furigana */}
          {card.lang === "ja" && revealed && furigana && card.reading && card.reading !== card.word && (
            <div className="mt-3.5 text-lg tracking-[0.2em] text-[#4aa8ff]">{card.reading}</div>
          )}

          {!revealed && (
            <div className="mt-10 animate-pulse text-sm uppercase tracking-[0.3em] opacity-50">
              tap to reveal
            </div>
          )}

          {revealed && (
            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-6 w-full"
            >
              <div className="text-3xl">{card.meaning}</div>
              {card.lang === "de" && <DePlural entry={card} />}
              <Example entry={card} lang={card.lang} furigana={furigana} />
              {card.tip && (
                <div className="mx-auto mt-3 flex max-w-[32ch] items-start justify-center gap-2 text-sm leading-snug opacity-60">
                  <Icon name="bulb" size={14} className="mt-0.5 shrink-0" />
                  <span>{card.tip}</span>
                </div>
              )}
            </motion.div>
          )}
        </div>

        {revealed && rated === null && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid grid-cols-3 gap-3"
          >
            <button
              className="btn-grade inline-flex items-center justify-center gap-1.5 border-bad text-bad"
              onClick={(e) => {
                e.stopPropagation();
                grade(1, e);
              }}
            >
              <Icon name="repeat" size={14} /> AGAIN
            </button>
            <button
              className="btn-grade border-(--accent) text-(--accent)"
              onClick={(e) => {
                e.stopPropagation();
                grade(3, e);
              }}
            >
              GOOD
            </button>
            <button
              className="btn-grade inline-flex items-center justify-center gap-1.5 border-good text-good"
              onClick={(e) => {
                e.stopPropagation();
                grade(4, e);
              }}
            >
              <Icon name="check" size={14} /> EASY
            </button>
          </motion.div>
        )}

        {rated !== null && (
          <div className="text-center text-sm uppercase tracking-[0.3em] opacity-50">
            {rated >= 3 ? "locked in — keep scrolling ↑" : "you'll see it again soon ↑"}
          </div>
        )}
      </motion.div>
      <XpPop amount={xp} />
    </div>
  );
}
