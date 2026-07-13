"use client";

// Card-pack opening: the variable-reward moment. Shake → burst → reveal the
// pulls one by one, golden cards shimmering.

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { Lang } from "@/lib/types";
import { openPack, type PackReward } from "@/lib/store";
import { sfxBonus, sfxAdd, sfxCorrect } from "@/lib/audio";
import { burst } from "@/lib/confetti";
import { CosmeticGlyph } from "./CosmeticGlyph";
import { Icon } from "./Icon";

export function PackOpen({ lang, onClose }: { lang: Lang; onClose: () => void }) {
  const [phase, setPhase] = useState<"sealed" | "opening" | "revealed">("sealed");
  const [reward, setReward] = useState<PackReward | null>(null);

  const rip = () => {
    if (phase !== "sealed") return;
    const r = openPack();
    if (!r) {
      onClose();
      return;
    }
    setReward(r);
    setPhase("opening");
  };

  useEffect(() => {
    if (phase !== "opening") return;
    const t = setTimeout(() => {
      setPhase("revealed");
      if (reward && reward.golden > 0) sfxBonus();
      else sfxCorrect(0);
      burst(innerWidth / 2, innerHeight / 2, reward && reward.golden > 0 ? ["#ffd400", "#fff"] : undefined, reward && reward.golden > 0 ? 120 : 60);
    }, 650);
    return () => clearTimeout(t);
  }, [phase, reward]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4" onClick={phase === "revealed" ? onClose : undefined}>
      <AnimatePresence mode="wait">
        {phase !== "revealed" ? (
          <motion.button
            key="pack"
            onClick={rip}
            className="golden card-panel !max-w-xs items-center justify-center gap-4"
            animate={
              phase === "opening"
                ? { rotate: [0, -6, 6, -6, 6, 0], scale: [1, 1.05, 1.1] }
                : { y: [0, -8, 0] }
            }
            transition={phase === "opening" ? { duration: 0.6 } : { duration: 1.4, repeat: Infinity }}
            exit={{ scale: 1.4, opacity: 0 }}
          >
            <Icon name="layers" size={68} className="text-yellow-300" />
            <div className="font-display text-2xl text-yellow-300">CARD PACK</div>
            <div className="text-sm uppercase tracking-[0.3em] opacity-70">
              {phase === "opening" ? "ripping…" : "tap to open"}
            </div>
          </motion.button>
        ) : (
          <motion.div
            key="reward"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="card-panel !max-w-sm"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="tag text-center">YOU PULLED</div>
            <div className="flex-1 space-y-2 overflow-y-auto py-2">
              {reward?.cards.map((c, i) => (
                <motion.div
                  key={c.id}
                  initial={{ x: -30, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: i * 0.12 }}
                  className={`flex items-center justify-between border-2 p-3 ${c.isGolden ? "golden border-yellow-300" : "border-line bg-black/30"}`}
                >
                  <div>
                    <span className={`text-xl ${lang === "ja" ? "font-jp" : ""}`}>
                      {c.article ? (
                        <>
                          <span className={c.article === "der" ? "text-der" : c.article === "die" ? "text-die" : "text-das"}>{c.article}</span> {c.word}
                        </>
                      ) : (
                        c.word
                      )}
                    </span>
                    <div className="text-sm opacity-60">{c.meaning}</div>
                  </div>
                  {c.isGolden && <span className="font-display text-yellow-300">★2×</span>}
                </motion.div>
              ))}
              {reward?.cosmetic && (
                <motion.div
                  initial={{ x: -30, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: (reward.cards.length + 1) * 0.12 }}
                  className="flex items-center gap-3 border-2 border-(--accent) bg-black/30 p-3"
                >
                  <CosmeticGlyph id={reward.cosmetic.id} size={36} />
                  <div>
                    <div className="font-display text-(--accent)">COSMETIC</div>
                    <div className="text-sm opacity-70">{reward.cosmetic.label} — for your pet</div>
                  </div>
                </motion.div>
              )}
            </div>
            <button
              className="btn-primary"
              onClick={() => {
                sfxAdd();
                onClose();
              }}
            >
              NICE ✓
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
