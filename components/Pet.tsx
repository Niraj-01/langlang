"use client";

// The pet: a procedural SVG blob that evolves with XP, emotes by mood,
// and wears cosmetics. It never dies — a skipped day just makes it sad.

import { motion } from "framer-motion";
import type { PetMood } from "@/lib/types";
import { petStage } from "@/lib/quests";
import { cosmeticById } from "@/lib/quests";
import { CosmeticGlyph } from "./CosmeticGlyph";

const BODY_BY_STAGE = ["#c9c4b6", "#7fd6c2", "#8ad67f", "#ff9e5c", "#c98bff"];
const GLOW_BY_STAGE = ["transparent", "transparent", "transparent", "#ff9e5c88", "#c98bffcc"];

export function Pet({
  xp,
  mood,
  equipped,
  size = 160,
}: {
  xp: number;
  mood: PetMood;
  equipped: string[];
  size?: number;
}) {
  const stage = petStage(xp);
  const body = BODY_BY_STAGE[stage];
  const glow = GLOW_BY_STAGE[stage];
  const isEgg = stage === 0;

  // mood shapes the face
  const eyeH = mood === "sad" ? 3 : mood === "happy" ? 10 : 7;
  const mouthPath =
    mood === "happy"
      ? "M 40 66 Q 50 76 60 66" // grin
      : mood === "sad"
        ? "M 40 72 Q 50 64 60 72" // frown
        : "M 42 70 L 58 70"; // flat

  const head = equipped.map((id) => cosmeticById(id)).find((c) => c?.slot === "head");
  const face = equipped.map((id) => cosmeticById(id)).find((c) => c?.slot === "face");
  const neck = equipped.map((id) => cosmeticById(id)).find((c) => c?.slot === "neck");

  return (
    <div
      className="relative"
      style={{ width: size, height: size, filter: glow !== "transparent" ? `drop-shadow(0 0 18px ${glow})` : undefined }}
    >
      <motion.div
        className="absolute inset-0"
        animate={
          mood === "sad"
            ? { y: [0, 2, 0] }
            : { y: [0, -6, 0], rotate: [-1.5, 1.5, -1.5] }
        }
        transition={{ duration: mood === "happy" ? 1.6 : 2.8, repeat: Infinity, ease: "easeInOut" }}
      >
        <svg viewBox="0 0 100 100" width={size} height={size}>
          {isEgg ? (
            <>
              <ellipse cx="50" cy="56" rx="30" ry="36" fill={body} stroke="#000" strokeWidth="3" />
              <path d="M 26 58 l 8 -8 l 8 8 l 8 -8 l 8 8 l 8 -8 l 8 8" fill="none" stroke="#00000033" strokeWidth="2" />
            </>
          ) : (
            <>
              {/* body blob */}
              <path
                d="M 50 16 C 74 16 84 36 84 56 C 84 80 68 90 50 90 C 32 90 16 80 16 56 C 16 36 26 16 50 16 Z"
                fill={body}
                stroke="#000"
                strokeWidth="3"
              />
              {/* feet */}
              <ellipse cx="36" cy="90" rx="9" ry="5" fill={body} stroke="#000" strokeWidth="3" />
              <ellipse cx="64" cy="90" rx="9" ry="5" fill={body} stroke="#000" strokeWidth="3" />
              {/* ears appear from stage 2 */}
              {stage >= 2 && (
                <>
                  <path d="M 30 20 L 24 6 L 40 16 Z" fill={body} stroke="#000" strokeWidth="3" />
                  <path d="M 70 20 L 76 6 L 60 16 Z" fill={body} stroke="#000" strokeWidth="3" />
                </>
              )}
            </>
          )}

          {/* cheeks when happy */}
          {mood === "happy" && !isEgg && (
            <>
              <circle cx="30" cy="62" r="5" fill="#ff5c7a55" />
              <circle cx="70" cy="62" r="5" fill="#ff5c7a55" />
            </>
          )}

          {/* eyes */}
          <ellipse cx="38" cy="52" rx="5" ry={eyeH} fill="#111" />
          <ellipse cx="62" cy="52" rx="5" ry={eyeH} fill="#111" />
          {mood === "happy" && (
            <>
              <circle cx="40" cy="49" r="1.6" fill="#fff" />
              <circle cx="64" cy="49" r="1.6" fill="#fff" />
            </>
          )}

          {/* mouth */}
          <path d={mouthPath} fill="none" stroke="#111" strokeWidth="3" strokeLinecap="round" />

          {/* sparkle at top stages */}
          {stage >= 3 && (
            <path
              d="M82 20v10M77 25h10M84 12l1.5 3 3 1.5-3 1.5L84 22l-1.5-3-3-1.5 3-1.5z"
              fill="#fff"
              stroke="none"
              className="animate-pulse"
            />
          )}
        </svg>
      </motion.div>

      {/* cosmetics as SVG overlays */}
      {neck && (
        <span className="absolute left-1/2 -translate-x-1/2" style={{ bottom: size * 0.12 }}>
          <CosmeticGlyph id={neck.id} size={size * 0.5} />
        </span>
      )}
      {face && (
        <span className="absolute left-1/2 -translate-x-1/2" style={{ top: size * 0.34 }}>
          <CosmeticGlyph id={face.id} size={size * 0.5} />
        </span>
      )}
      {head && (
        <span
          className="absolute left-1/2 -translate-x-1/2"
          style={{ top: isEgg ? size * 0.02 : -size * 0.12 }}
        >
          <CosmeticGlyph id={head.id} size={size * 0.55} />
        </span>
      )}
    </div>
  );
}
