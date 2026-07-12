"use client";

// New word drop: audio, example, one-tap add. Double-tap anywhere also adds;
// press-and-hold replays the audio.

import { useRef, useState } from "react";
import { motion } from "framer-motion";
import type { Lang, VocabEntry } from "@/lib/types";
import { SEED, SEED_LABEL } from "@/lib/seed";
import { addNewWord, skipNewWord } from "@/lib/store";
import { speak, sfxAdd } from "@/lib/audio";
import { burst } from "@/lib/confetti";
import { JaWord, DeNoun, DePlural, Example } from "@/components/Lex";
import { XpPop } from "./XpPop";

export function NewWordCard({
  lang,
  entryIndex,
  furigana,
  onAnswered,
}: {
  lang: Lang;
  entryIndex: number;
  furigana: boolean;
  onAnswered: (correct: boolean) => void;
}) {
  const entry: VocabEntry | undefined = SEED[lang][entryIndex];
  const [added, setAdded] = useState(false);
  const [skipped, setSkipped] = useState(false);
  const [xp, setXp] = useState<number | null>(null);
  const lastTap = useRef(0);
  const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  if (!entry) return null;
  const say = () => speak(entry.example ?? entry.word, lang);

  const add = (e?: { clientX: number; clientY: number }) => {
    if (added || skipped) return;
    setAdded(true);
    addNewWord(lang, entryIndex);
    sfxAdd();
    setXp(5);
    burst(e?.clientX ?? innerWidth / 2, e?.clientY ?? innerHeight * 0.7);
    onAnswered(true);
  };

  const skip = () => {
    if (added || skipped) return;
    setSkipped(true);
    skipNewWord(lang, entryIndex);
    onAnswered(true);
  };

  return (
    <div className="card-shell">
      <div
        className="card-panel"
        onPointerDown={() => {
          holdTimer.current = setTimeout(say, 400);
        }}
        onPointerUp={() => holdTimer.current && clearTimeout(holdTimer.current)}
        onPointerLeave={() => holdTimer.current && clearTimeout(holdTimer.current)}
        onClick={(e) => {
          const now = Date.now();
          if (now - lastTap.current < 300) add(e);
          lastTap.current = now;
        }}
      >
        <div className="tag">
          NEW WORD <span className="opacity-50">· {SEED_LABEL[lang]}</span>
        </div>

        <div className="flex flex-1 flex-col items-center justify-center text-center">
          <button
            className="group"
            onClick={(e) => {
              e.stopPropagation();
              speak(entry.word, lang);
            }}
          >
            {lang === "ja" ? (
              <JaWord
                word={entry.word}
                reading={entry.reading}
                furigana={furigana}
                className="text-7xl font-bold"
              />
            ) : (
              <DeNoun entry={entry} className="text-6xl font-bold" />
            )}
            <div className="mt-2 text-xs uppercase tracking-[0.3em] opacity-40 group-active:opacity-90">
              ▶ tap word for audio · hold card to replay
            </div>
          </button>

          <div className="mt-5 text-3xl">{entry.meaning}</div>
          {lang === "de" && <DePlural entry={entry} />}
          {entry.pos && (
            <div className="mt-1 text-xs uppercase tracking-widest opacity-40">
              {entry.pos}
            </div>
          )}
          <Example entry={entry} lang={lang} furigana={furigana} />
          {(entry.mnemonic ?? entry.tip) && (
            <div className="mt-4 max-w-[30ch] rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm leading-snug opacity-80">
              {entry.mnemonic ? <>🧠 {entry.mnemonic}</> : <>💡 {entry.tip}</>}
            </div>
          )}
        </div>

        {!added && !skipped ? (
          <div className="grid grid-cols-[1fr_auto] gap-3">
            <motion.button
              whileTap={{ scale: 0.94 }}
              className="btn-primary"
              onClick={(e) => {
                e.stopPropagation();
                add(e);
              }}
            >
              ＋ ADD TO DECK
            </motion.button>
            <button
              className="btn-ghost"
              onClick={(e) => {
                e.stopPropagation();
                skip();
              }}
            >
              SKIP
            </button>
          </div>
        ) : (
          <div className="text-center text-sm uppercase tracking-[0.3em] opacity-50">
            {added ? "in the deck — keep scrolling ↑" : "skipped ↑"}
          </div>
        )}
      </div>
      <XpPop amount={xp} />
    </div>
  );
}
