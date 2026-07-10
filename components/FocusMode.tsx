"use client";

// Focus Mode ("Subway Surfers mode"): bottom half is a procedurally generated
// satisfying loop (flowing metaballs + drifting particles). Top half is a
// hands-free audio drill — sentences play, transcript reveals word-by-word,
// and an occasional tap-check keeps you from fully zoning out.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { useApp } from "@/lib/store";
import { SEED } from "@/lib/seed";
import type { AppState, Lang } from "@/lib/types";
import { speak as tts, sfxCorrect, sfxWrong } from "@/lib/audio";

interface Drill {
  text: string;
  reading?: string;
  meaning: string;
}

function buildPool(state: AppState, lang: Lang): Drill[] {
  const out: Drill[] = [];
  for (const c of state.cards) {
    if (c.lang !== lang) continue;
    if (c.type === "sentence") out.push({ text: c.word, reading: c.reading, meaning: c.meaning });
    else if (c.example) out.push({ text: c.example, reading: c.exampleReading, meaning: c.exampleMeaning ?? c.meaning });
  }
  if (out.length < 4) {
    for (const e of SEED[lang]) {
      if (e.example) out.push({ text: e.example, reading: e.exampleReading, meaning: e.exampleMeaning ?? e.meaning });
    }
  }
  // shuffle
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function segments(text: string, lang: Lang): string[] {
  if (lang === "de") return text.split(/(\s+)/).filter((s) => s.length);
  // Japanese: reveal a couple characters at a time
  const chunks: string[] = [];
  for (let i = 0; i < text.length; i += 2) chunks.push(text.slice(i, i + 2));
  return chunks;
}

export function FocusMode() {
  const state = useApp();
  const lang = state.lang;
  const accent = lang === "ja" ? "lang-ja" : "lang-de";
  // randomized drill content is client-only — gate to avoid SSR mismatch
  const [mounted, setMounted] = useState(false);
  const pool = useMemo(() => (mounted ? buildPool(state, lang) : []), [mounted, state.cards, lang]);

  const [idx, setIdx] = useState(0);
  const [revealed, setRevealed] = useState(0);
  const [showMeaning, setShowMeaning] = useState(false);
  const [playing, setPlaying] = useState(true);
  const [check, setCheck] = useState<{ options: string[]; answer: number; picked: number | null } | null>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const drill = pool[idx % Math.max(1, pool.length)];

  const clearTimers = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  };

  const next = useCallback(() => {
    setIdx((i) => i + 1);
  }, []);

  // advance the current drill: every 4th item is a comprehension check
  useEffect(() => {
    if (!drill || !playing) return;
    clearTimers();
    setShowMeaning(false);
    setRevealed(0);

    const isCheck = idx > 0 && idx % 4 === 0 && pool.length >= 4;
    if (isCheck) {
      const distractors: string[] = [];
      const seen = new Set([drill.meaning]);
      while (distractors.length < 3 && seen.size < pool.length) {
        const cand = pool[Math.floor(Math.random() * pool.length)].meaning;
        if (!seen.has(cand)) {
          seen.add(cand);
          distractors.push(cand);
        }
      }
      const options = [drill.meaning, ...distractors].sort(() => Math.random() - 0.5);
      setCheck({ options, answer: options.indexOf(drill.meaning), picked: null });
      tts(drill.text, lang);
      return;
    }

    setCheck(null);
    tts(drill.text, lang);
    const segs = segments(drill.text, lang);
    const per = Math.max(220, Math.min(600, 2600 / segs.length));
    for (let i = 1; i <= segs.length; i++) {
      timers.current.push(setTimeout(() => setRevealed(i), i * per));
    }
    timers.current.push(setTimeout(() => setShowMeaning(true), segs.length * per + 300));
    timers.current.push(setTimeout(next, segs.length * per + 2600));

    return clearTimers;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idx, playing, drill?.text]);

  const pick = (i: number) => {
    if (!check || check.picked !== null) return;
    const correct = i === check.answer;
    setCheck({ ...check, picked: i });
    if (correct) sfxCorrect(0);
    else {
      sfxWrong();
      tts(drill.text, lang);
    }
    timers.current.push(setTimeout(next, 1600));
  };

  useEffect(() => setMounted(true), []);
  useEffect(() => () => clearTimers(), []);

  if (!mounted) return <div className={`${accent} h-dvh bg-bg`} />;

  const segs = drill ? segments(drill.text, lang) : [];
  const shown = segs.slice(0, revealed).join("");

  return (
    <div className={`${accent} flex h-dvh flex-col bg-bg`}>
      {/* top: audio drill */}
      <div className="relative flex flex-1 flex-col">
        <div className="flex items-center justify-between p-3">
          <Link href="/reels" className="hud-chip">
            ← FEED
          </Link>
          <div className="font-display text-xs uppercase tracking-[0.3em] text-(--accent)">
            Focus Mode
          </div>
          <button className="hud-chip press" onClick={() => setPlaying((p) => !p)}>
            {playing ? "⏸" : "▶"}
          </button>
        </div>

        <div className="flex flex-1 flex-col items-center justify-center gap-6 p-6 text-center">
          {check ? (
            <>
              <div className="text-sm uppercase tracking-[0.3em] opacity-50">
                🎧 what did they say?
              </div>
              <button
                className="text-2xl underline decoration-dotted"
                onClick={() => tts(drill.text, lang)}
              >
                ▶ replay
              </button>
              <div className="grid w-full max-w-md grid-cols-1 gap-2">
                {check.options.map((opt, i) => {
                  let cls = "btn-option";
                  if (check.picked !== null) {
                    if (i === check.answer) cls += " correct";
                    else if (i === check.picked) cls += " wrong";
                    else cls += " opacity-40";
                  }
                  return (
                    <button key={i} className={cls} onClick={() => pick(i)}>
                      {opt}
                    </button>
                  );
                })}
              </div>
            </>
          ) : (
            <>
              <div className={`min-h-[3rem] text-4xl leading-relaxed ${lang === "ja" ? "font-jp" : ""}`}>
                {shown}
                <span className="animate-pulse opacity-40">
                  {revealed < segs.length ? "▍" : ""}
                </span>
              </div>
              {lang === "ja" && state.furigana && drill?.reading && showMeaning && (
                <div className="font-jp text-base opacity-40">{drill.reading}</div>
              )}
              <motion.div
                animate={{ opacity: showMeaning ? 0.7 : 0 }}
                className="text-lg italic"
              >
                {drill?.meaning}
              </motion.div>
            </>
          )}
        </div>
      </div>

      {/* bottom: procedural visual */}
      <div className="relative h-[42vh] shrink-0 overflow-hidden border-t-4 border-line">
        <FlowCanvas lang={lang} />
        <div className="pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2 text-[10px] uppercase tracking-[0.3em] opacity-40">
          too fried to study? just watch. ↑ tap the checks
        </div>
      </div>
    </div>
  );
}

function FlowCanvas({ lang }: { lang: Lang }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const accent = lang === "ja" ? [255, 59, 31] : [216, 240, 0];

    let raf = 0;
    const blobs = Array.from({ length: 5 }, (_, i) => ({
      x: Math.random(),
      y: Math.random(),
      r: 0.25 + Math.random() * 0.25,
      dx: (Math.random() - 0.5) * 0.0016,
      dy: (Math.random() - 0.5) * 0.0016,
      hue: i,
    }));
    const particles = Array.from({ length: 40 }, () => ({
      x: Math.random(),
      y: Math.random(),
      s: 0.5 + Math.random() * 2,
      v: 0.0008 + Math.random() * 0.0022,
    }));

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      canvas.width = canvas.clientWidth * dpr;
      canvas.height = canvas.clientHeight * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);

    const draw = () => {
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      ctx.fillStyle = "#07070c";
      ctx.fillRect(0, 0, w, h);

      // flowing metaball-ish gradients
      ctx.globalCompositeOperation = "lighter";
      for (const b of blobs) {
        b.x += b.dx;
        b.y += b.dy;
        if (b.x < -0.2 || b.x > 1.2) b.dx *= -1;
        if (b.y < -0.2 || b.y > 1.2) b.dy *= -1;
        const cx = b.x * w;
        const cy = b.y * h;
        const rad = b.r * Math.min(w, h) * 1.6;
        const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, rad);
        const shade = b.hue % 2 === 0 ? accent : [90, 130, 255];
        g.addColorStop(0, `rgba(${shade[0]},${shade[1]},${shade[2]},0.5)`);
        g.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(cx, cy, rad, 0, Math.PI * 2);
        ctx.fill();
      }

      // drifting particles
      ctx.globalCompositeOperation = "source-over";
      ctx.fillStyle = "rgba(255,255,255,0.7)";
      for (const p of particles) {
        p.y -= p.v;
        if (p.y < -0.02) {
          p.y = 1.02;
          p.x = Math.random();
        }
        ctx.beginPath();
        ctx.arc(p.x * w, p.y * h, p.s, 0, Math.PI * 2);
        ctx.fill();
      }

      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, [lang]);

  return <canvas ref={ref} className="h-full w-full" />;
}
