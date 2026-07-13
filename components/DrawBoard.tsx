"use client";

// Character drawing practice. Pick a set, trace the faint guide character on
// grid paper (or hide it to test yourself), then clear and move on. Accepts a
// ?char= param so the "Practice drawing" buttons jump straight to a character.

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { speakJa, canSpeak } from "@/lib/speak";
import { useMounted } from "@/lib/useMounted";
import { Icon } from "./Icon";
import { StrokeOrder } from "./StrokeOrder";

export interface DrawItem {
  char: string;
  reading: string;
  meaning: string;
  set: "hiragana" | "katakana" | "kanji";
  strokes?: number;
}

type SetId = "hiragana" | "katakana" | "kanji";

export function DrawBoard({ items }: { items: DrawItem[] }) {
  const params = useSearchParams();
  const initialChar = params.get("char");
  const initialItem = initialChar ? items.find((i) => i.char === initialChar) : undefined;

  const [set, setSet] = useState<SetId>(initialItem?.set ?? "hiragana");
  const pool = items.filter((i) => i.set === set);
  const [idx, setIdx] = useState(() => {
    if (initialItem) return items.filter((i) => i.set === initialItem.set).indexOf(initialItem);
    return 0;
  });
  const [guide, setGuide] = useState(true);
  const speech = useMounted() && canSpeak();
  const current = pool[Math.min(idx, pool.length - 1)] ?? pool[0];

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const last = useRef<{ x: number; y: number } | null>(null);

  const clear = () => {
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    ctx?.clearRect(0, 0, c.width, c.height);
  };

  // size the canvas to its box (accounting for device pixel ratio)
  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    const resize = () => {
      const rect = c.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      c.width = rect.width * dpr;
      c.height = rect.height * dpr;
      const ctx = c.getContext("2d");
      if (ctx) {
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.lineWidth = 14;
        ctx.strokeStyle = "#ff5a5f";
      }
    };
    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, []);

  // clear the ink whenever the character changes
  useEffect(clear, [current?.char]);

  const pointFromEvent = (e: React.PointerEvent) => {
    const c = canvasRef.current!;
    const rect = c.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const start = (e: React.PointerEvent) => {
    e.preventDefault();
    (e.target as Element).setPointerCapture(e.pointerId);
    drawing.current = true;
    last.current = pointFromEvent(e);
  };
  const move = (e: React.PointerEvent) => {
    if (!drawing.current) return;
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx || !last.current) return;
    const p = pointFromEvent(e);
    ctx.beginPath();
    ctx.moveTo(last.current.x, last.current.y);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    last.current = p;
  };
  const end = () => {
    drawing.current = false;
    last.current = null;
  };

  const next = () => {
    setIdx((i) => (i + 1) % pool.length);
  };
  const prev = () => {
    setIdx((i) => (i - 1 + pool.length) % pool.length);
  };
  const random = () => {
    setIdx(Math.floor(Math.random() * pool.length));
  };

  if (!current) return null;

  return (
    <div className="mx-auto max-w-md">
      {/* set switch */}
      <div className="mb-4 flex gap-2">
        {(
          [
            ["hiragana", "Hiragana"],
            ["katakana", "Katakana"],
            ["kanji", "Kanji"],
          ] as [SetId, string][]
        ).map(([id, label]) => (
          <button
            key={id}
            onClick={() => {
              setSet(id);
              setIdx(0);
            }}
            className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition ${
              set === id
                ? "border-accent bg-accent/10 text-accent"
                : "border-line bg-surface text-muted hover:text-ink"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* prompt */}
      <div className="mb-3 flex items-center justify-between">
        <div>
          <button onClick={() => speakJa(current.char)} className="romaji text-lg hover:text-accent">
            <span className="inline-flex items-center gap-1.5">{current.reading} {speech && <Icon name="sound" size={14} />}</span>
          </button>
          {current.meaning && <span className="ml-2 text-sm text-muted">· {current.meaning}</span>}
          {current.strokes && (
            <span className="ml-2 text-xs text-muted">· {current.strokes} strokes</span>
          )}
        </div>
        <span className="text-xs text-muted">
          {(idx % pool.length) + 1}/{pool.length}
        </span>
      </div>

      {/* stroke order — watch, then trace below */}
      <div className="mb-4 rounded-2xl border border-line bg-surface2 p-4">
        <div className="mb-2 text-center text-[11px] uppercase tracking-widest text-muted">
          Stroke order — watch, then trace
        </div>
        <StrokeOrder char={current.char} />
      </div>

      {/* canvas board */}
      <div className="relative aspect-square w-full overflow-hidden rounded-2xl border border-line bg-surface">
        {/* grid + guide layer (behind the ink) */}
        <div className="pointer-events-none absolute inset-0">
          <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
            <line x1="50" y1="0" x2="50" y2="100" stroke="#2b303b" strokeWidth="0.5" strokeDasharray="3 3" />
            <line x1="0" y1="50" x2="100" y2="50" stroke="#2b303b" strokeWidth="0.5" strokeDasharray="3 3" />
          </svg>
          {guide && (
            <div className="jp absolute inset-0 flex items-center justify-center text-[16rem] leading-none text-ink/10 select-none">
              {current.char}
            </div>
          )}
        </div>
        {/* ink layer */}
        <canvas
          ref={canvasRef}
          className="absolute inset-0 h-full w-full touch-none"
          onPointerDown={start}
          onPointerMove={move}
          onPointerUp={end}
          onPointerLeave={end}
          onPointerCancel={end}
        />
      </div>

      {/* controls */}
      <div className="mt-4 grid grid-cols-2 gap-2">
        <button
          onClick={() => setGuide((g) => !g)}
          className={`rounded-lg border py-2.5 text-sm font-medium transition ${
            guide ? "border-accent2 text-accent2" : "border-line text-muted"
          }`}
        >
          <span className="inline-flex items-center gap-1.5"><Icon name="eye" size={15} /> {guide ? "Guide: ON (trace)" : "Guide: OFF (test)"}</span>
        </button>
        <button onClick={clear} className="rounded-lg border border-line py-2.5 text-sm font-medium text-muted hover:text-ink">
          ↺ Clear
        </button>
      </div>
      <div className="mt-2 grid grid-cols-3 gap-2">
        <button onClick={prev} className="rounded-lg border border-line py-2.5 text-sm text-muted hover:text-ink">
          ← Prev
        </button>
        <button onClick={random} className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-line py-2.5 text-sm text-muted hover:text-ink">
          <Icon name="dice" size={15} /> Random
        </button>
        <button onClick={next} className="rounded-lg bg-accent py-2.5 text-sm font-semibold text-white">
          Next →
        </button>
      </div>

      <p className="mt-4 text-center text-xs text-muted">
        Trace the faint character with your finger or mouse. Turn the guide off to test yourself.
      </p>
      <p className="mt-2 text-center text-[10px] text-muted/60">
        Stroke data:{" "}
        <a
          href="https://kanjivg.tagaini.net/"
          target="_blank"
          rel="noreferrer"
          className="underline hover:text-muted"
        >
          KanjiVG
        </a>{" "}
        (CC BY-SA 3.0)
      </p>
    </div>
  );
}
