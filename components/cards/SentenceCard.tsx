"use client";

// i+1 sentence card: a real Tatoeba sentence where every word is mastered
// except ONE, highlighted in the accent color. Tap any word for a gloss; tap
// the highlighted word to reveal it, then self-grade comprehension — the grade
// rates THAT word's FSRS card through the normal review flow.

import { useState } from "react";
import { motion } from "framer-motion";
import type { Lang } from "@/lib/types";
import { SENTENCES } from "@/lib/sentences";
import { SEED } from "@/lib/seed";
import { getState, addNewWord, rateCard, cardIdFor } from "@/lib/store";
import { speak, sfxCorrect, sfxWrong } from "@/lib/audio";
import { burst } from "@/lib/confetti";
import { Icon } from "@/components/Icon";
import { XpPop } from "./XpPop";

export function SentenceCard({
  lang,
  sentenceIdx,
  unknownSeedIndex,
  furigana,
  combo,
  multiplier,
  onAnswered,
}: {
  lang: Lang;
  sentenceIdx: number;
  unknownSeedIndex: number;
  furigana: boolean;
  combo: number;
  multiplier: number;
  onAnswered: (correct: boolean) => void;
}) {
  const sentence = SENTENCES[lang][sentenceIdx];
  const unknownEntry = SEED[lang][unknownSeedIndex];
  const [revealed, setRevealed] = useState(false);
  const [rated, setRated] = useState<boolean | null>(null);
  const [glossIdx, setGlossIdx] = useState<number | null>(null); // seedIndex of last tapped word
  const [xp, setXp] = useState<number | null>(null);

  if (!sentence || !unknownEntry) return null;

  const tapToken = (seedIndex: number) => {
    setGlossIdx(seedIndex);
    speak(SEED[lang][seedIndex].word, lang);
    if (seedIndex === unknownSeedIndex) setRevealed(true);
  };

  const grade = (ok: boolean, e: React.MouseEvent) => {
    if (rated !== null) return;
    setRated(ok);
    // the unknown is either an existing due card, or the current new word —
    // ensure the card exists, then rate it through the normal review flow
    const existing = getState().cards.find((c) => c.id === cardIdFor(lang, unknownEntry.word));
    const card = existing ?? addNewWord(lang, unknownSeedIndex);
    const earned = rateCard(card.id, ok ? 3 : 1, multiplier);
    if (ok) {
      setXp(earned || null);
      sfxCorrect(combo);
      burst(e.clientX, e.clientY, undefined, 50);
    } else {
      sfxWrong();
    }
    onAnswered(ok);
  };

  const glossEntry = glossIdx !== null ? SEED[lang][glossIdx] : null;

  return (
    <div className="card-shell">
      <div className="card-panel">
        <div className="tag">
          SENTENCE <span className="opacity-50">· one new word</span>
        </div>

        <div className="flex flex-1 flex-col items-center justify-center text-center">
          {/* the sentence — every mapped word is tappable */}
          <div
            className={`leading-relaxed ${lang === "ja" ? "font-jp text-4xl" : "text-3xl font-semibold"}`}
          >
            {sentence.tokens.map((t, i) => {
              const sep = lang === "de" && i > 0 ? " " : "";
              if (t.seedIndex === null) {
                return (
                  <span key={i} className="opacity-90">
                    {sep}
                    {t.surface}
                  </span>
                );
              }
              const isUnknown = t.seedIndex === unknownSeedIndex;
              return (
                <span key={i}>
                  {sep}
                  <button
                    onClick={() => tapToken(t.seedIndex!)}
                    className={
                      isUnknown
                        ? `text-(--accent) underline decoration-dashed decoration-2 underline-offset-8 ${revealed ? "" : "animate-pulse"}`
                        : "underline decoration-line decoration-2 underline-offset-8 hover:decoration-(--accent)"
                    }
                  >
                    {t.surface}
                  </button>
                </span>
              );
            })}
          </div>

          {/* play the whole sentence */}
          <button
            onClick={() => speak(sentence.text, lang)}
            className="mt-4 flex items-center gap-1.5 text-xs uppercase tracking-[0.3em] opacity-40 hover:opacity-90"
            aria-label="Hear the sentence"
          >
            <Icon name="sound" size={13} /> hear it
          </button>

          {/* gloss for the last tapped word */}
          {glossEntry && (
            <motion.div
              key={glossIdx}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className={`mt-5 flex items-baseline gap-3 rounded-xl border px-4 py-2.5 text-left ${
                glossIdx === unknownSeedIndex ? "border-(--accent)/50 bg-(--accent)/10" : "border-white/10 bg-white/5"
              }`}
            >
              <span className={`text-xl font-bold ${lang === "ja" ? "font-jp" : ""}`}>
                {glossEntry.word}
              </span>
              {lang === "ja" && furigana && glossEntry.reading && (
                <span className="font-jp text-sm text-[#4aa8ff]">{glossEntry.reading}</span>
              )}
              <span className="text-sm opacity-70">{glossEntry.meaning}</span>
            </motion.div>
          )}

          {!revealed && (
            <div className="mt-6 text-xs uppercase tracking-[0.3em] opacity-40">
              tap the highlighted word
            </div>
          )}

          {/* after grading, confirm with the translation */}
          {rated !== null && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-5 max-w-[36ch] text-base italic opacity-70"
            >
              “{sentence.translation}”
            </motion.div>
          )}
        </div>

        {revealed && rated === null && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <div className="mb-2 text-center text-xs uppercase tracking-[0.3em] opacity-50">
              did you understand the sentence?
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button
                className="btn-grade inline-flex items-center justify-center gap-1.5 border-bad text-bad"
                onClick={(e) => grade(false, e)}
              >
                <Icon name="repeat" size={14} /> AGAIN
              </button>
              <button
                className="btn-grade inline-flex items-center justify-center gap-1.5 border-good text-good"
                onClick={(e) => grade(true, e)}
              >
                <Icon name="check" size={14} /> GOT IT
              </button>
            </div>
          </motion.div>
        )}

        {rated !== null && (
          <div className="text-center text-sm uppercase tracking-[0.3em] opacity-50">
            {rated ? "locked in — keep scrolling ↑" : "you'll see it again soon ↑"}
          </div>
        )}
      </div>
      <XpPop amount={xp} />
    </div>
  );
}
