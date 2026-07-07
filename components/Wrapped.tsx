"use client";

// Weekly Wrapped — a Spotify-Wrapped-style story of your week. Tap through
// full-screen cards; each exports as a 1080x1920 image for IG stories,
// rendered on an offscreen canvas.

import { useMemo, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useApp, weeklyStats, hardestWord } from "@/lib/store";
import { petStageName, petStage } from "@/lib/quests";
import type { AppState, Lang } from "@/lib/types";

interface Slide {
  key: string;
  emoji: string;
  label: string;
  big: string;
  sub: string;
}

function buildSlides(state: AppState, lang: Lang): Slide[] {
  const w = weeklyStats(state);
  const hard = hardestWord(state, lang);
  const acc = w.reviews > 0 ? Math.round((w.correct / w.reviews) * 100) : 0;
  const langName = lang === "ja" ? "Japanese" : "German";
  return [
    {
      key: "intro",
      emoji: "📅",
      label: "Your week in",
      big: langName,
      sub: `${w.activeDays} active day${w.activeDays === 1 ? "" : "s"} · let's recap`,
    },
    {
      key: "minutes",
      emoji: "⏱️",
      label: "You practiced for",
      big: `${w.minutes} min`,
      sub: w.minutes >= 60 ? "over an hour. respect." : "every minute counts.",
    },
    {
      key: "words",
      emoji: "🧠",
      label: "New words learned",
      big: `${w.newWords}`,
      sub: `and ${w.reviews} reviews cleared at ${acc}% accuracy`,
    },
    {
      key: "hard",
      emoji: "😤",
      label: "Your nemesis word",
      big: hard ? hard.word : "—",
      sub: hard ? `${hard.meaning} · ${hard.fsrs.lapses} lapse${hard.fsrs.lapses === 1 ? "" : "s"}` : "no villains this week",
    },
    {
      key: "combo",
      emoji: "🔥",
      label: "Longest combo",
      big: `${state.bestCombo}x`,
      sub: "consecutive correct. unbroken.",
    },
    {
      key: "pet",
      emoji: "🥚",
      label: `${state.pet.name} is now a`,
      big: petStageName(state.xp),
      sub: `stage ${petStage(state.xp) + 1}/5 · ${state.xp} total XP`,
    },
    {
      key: "outro",
      emoji: "🏆",
      label: "Weekly Wrapped",
      big: "Share it",
      sub: "flex your week. same time next Sunday.",
    },
  ];
}

const GRAD: Record<Lang, [string, string]> = {
  ja: ["#ff3b1f", "#7a0f00"],
  de: ["#d8f000", "#4a5400"],
};

export function Wrapped() {
  const state = useApp();
  const lang = state.lang;
  const accent = lang === "ja" ? "lang-ja" : "lang-de";
  const slides = useMemo(() => buildSlides(state, lang), [state, lang]);
  const [i, setI] = useState(0);

  const slide = slides[i];
  const advance = () => setI((n) => Math.min(slides.length - 1, n + 1));
  const back = () => setI((n) => Math.max(0, n - 1));

  const share = () => exportSlide(slide, state.pet.name, lang);

  return (
    <div className={`${accent} relative flex h-dvh flex-col bg-bg`}>
      {/* progress bars */}
      <div className="absolute inset-x-0 top-0 z-10 flex gap-1 p-3">
        {slides.map((s, n) => (
          <div key={s.key} className="h-1 flex-1 overflow-hidden bg-white/20">
            <div className={`h-full bg-white transition-all ${n <= i ? "w-full" : "w-0"}`} />
          </div>
        ))}
      </div>

      <div className="absolute right-3 top-6 z-10">
        <Link href="/" className="hud-chip">
          ✕
        </Link>
      </div>

      {/* tap zones */}
      <button className="absolute inset-y-0 left-0 z-[5] w-1/3" onClick={back} aria-label="back" />
      <button className="absolute inset-y-0 right-0 z-[5] w-2/3" onClick={advance} aria-label="next" />

      <AnimatePresence mode="wait">
        <motion.div
          key={slide.key}
          initial={{ opacity: 0, scale: 0.94 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 1.04 }}
          transition={{ duration: 0.35 }}
          className="flex flex-1 flex-col items-center justify-center gap-5 p-8 text-center"
          style={{ background: `linear-gradient(160deg, ${GRAD[lang][0]}22, ${GRAD[lang][1]}44)` }}
        >
          <div className="text-7xl">{slide.emoji}</div>
          <div className="text-sm uppercase tracking-[0.3em] opacity-70">{slide.label}</div>
          <div className={`font-display text-6xl text-(--accent) ${lang === "ja" && slide.key === "hard" ? "font-jp" : ""}`}>
            {slide.big}
          </div>
          <div className="max-w-xs text-lg opacity-80">{slide.sub}</div>
        </motion.div>
      </AnimatePresence>

      {/* footer */}
      <div className="z-10 flex items-center justify-between p-4">
        <div className="font-display text-sm tracking-widest opacity-40">langlang</div>
        <button className="btn-primary" onClick={share}>
          ⬇ SHARE THIS CARD
        </button>
      </div>
    </div>
  );
}

// Render a slide to a 1080x1920 canvas and trigger a PNG download.
function exportSlide(slide: Slide, petName: string, lang: Lang) {
  const W = 1080;
  const H = 1920;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const [a, b] = GRAD[lang];
  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, "#0b0b10");
  bg.addColorStop(0.5, b);
  bg.addColorStop(1, "#0b0b10");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // frame
  ctx.strokeStyle = a;
  ctx.lineWidth = 14;
  ctx.strokeRect(40, 40, W - 80, H - 80);

  ctx.textAlign = "center";
  ctx.fillStyle = "#f2f2f5";

  ctx.font = "200px sans-serif";
  ctx.fillText(slide.emoji, W / 2, 620);

  ctx.font = "bold 46px sans-serif";
  ctx.fillStyle = "#f2f2f5cc";
  ctx.fillText(slide.label.toUpperCase(), W / 2, 780);

  ctx.fillStyle = a;
  ctx.font = "900 150px sans-serif";
  wrapText(ctx, slide.big, W / 2, 980, W - 200, 160);

  ctx.fillStyle = "#f2f2f5cc";
  ctx.font = "44px sans-serif";
  wrapText(ctx, slide.sub, W / 2, 1300, W - 240, 60);

  ctx.fillStyle = a;
  ctx.font = "900 56px sans-serif";
  ctx.fillText("langlang", W / 2, H - 160);
  ctx.fillStyle = "#f2f2f588";
  ctx.font = "36px sans-serif";
  ctx.fillText(`${petName}'s weekly wrapped`, W / 2, H - 100);

  canvas.toBlob((blob) => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `langlang-wrapped-${slide.key}.png`;
    link.click();
    URL.revokeObjectURL(url);
  }, "image/png");
}

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number
) {
  const words = text.split(" ");
  let line = "";
  let yy = y;
  for (const word of words) {
    const test = line ? line + " " + word : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      ctx.fillText(line, x, yy);
      line = word;
      yy += lineHeight;
    } else {
      line = test;
    }
  }
  ctx.fillText(line, x, yy);
}
