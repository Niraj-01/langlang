"use client";

// Animated stroke order — draws each stroke in sequence from KanjiVG path data.
// A faint full character sits behind as a target; numbered dots mark where each
// stroke begins. For kana combos (きゃ) the component characters animate in a row.

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import strokes from "@/data/strokes.json";

type StrokeData = Record<string, { viewBox: string; paths: string[] }>;
const DATA = strokes as StrokeData;

const STROKE_DURATION = 0.55; // seconds per stroke

function startPoint(d: string): [number, number] | null {
  const m = d.match(/^\s*[Mm]\s*(-?[\d.]+)[,\s]+(-?[\d.]+)/);
  return m ? [parseFloat(m[1]), parseFloat(m[2])] : null;
}

export function StrokeOrder({ char, size = 132 }: { char: string; size?: number }) {
  const comps = useMemo(
    () => [...char].map((c) => DATA[c]).filter(Boolean),
    [char]
  );
  const [runId, setRunId] = useState(0);
  const [showNumbers, setShowNumbers] = useState(true);

  if (comps.length === 0) {
    return (
      <div className="text-xs text-muted">Stroke order isn&apos;t available for this character.</div>
    );
  }

  const total = comps.reduce((n, c) => n + c.paths.length, 0);
  let strokeCounter = 0;

  return (
    <div className="flex flex-col items-center gap-2">
      <div key={runId} className="flex items-center gap-2">
        {comps.map((comp, ci) => (
          <svg
            key={ci}
            viewBox="0 0 109 109"
            width={comps.length > 1 ? size * 0.72 : size}
            height={comps.length > 1 ? size * 0.72 : size}
            className="rounded-lg border border-line bg-surface"
          >
            {/* grid */}
            <line x1="54.5" y1="0" x2="54.5" y2="109" stroke="#2b303b" strokeWidth="0.6" strokeDasharray="4 4" />
            <line x1="0" y1="54.5" x2="109" y2="54.5" stroke="#2b303b" strokeWidth="0.6" strokeDasharray="4 4" />

            {/* faint target: the whole character */}
            {comp.paths.map((d, i) => (
              <path key={`g${i}`} d={d} fill="none" stroke="#f2f4f8" strokeOpacity="0.12" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" />
            ))}

            {/* animated strokes, drawn in order */}
            {comp.paths.map((d, i) => {
              const order = strokeCounter++;
              return (
                <motion.path
                  key={`s${i}`}
                  d={d}
                  fill="none"
                  stroke="#ff5a5f"
                  strokeWidth="4.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  initial={{ pathLength: 0, opacity: 0 }}
                  animate={{ pathLength: 1, opacity: 1 }}
                  transition={{
                    pathLength: { delay: order * STROKE_DURATION, duration: STROKE_DURATION, ease: "easeInOut" },
                    opacity: { delay: order * STROKE_DURATION, duration: 0.01 },
                  }}
                />
              );
            })}

            {/* numbered stroke starts */}
            {showNumbers &&
              comp.paths.map((d, i) => {
                const p = startPoint(d);
                if (!p) return null;
                const order = strokeCounter - comp.paths.length + i;
                return (
                  <motion.g
                    key={`n${i}`}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: order * STROKE_DURATION }}
                  >
                    <circle cx={p[0]} cy={p[1]} r="7" fill="#4aa8ff" />
                    <text x={p[0]} y={p[1] + 3.2} textAnchor="middle" fontSize="9" fill="#0f1115" fontWeight="700">
                      {order + 1}
                    </text>
                  </motion.g>
                );
              })}
          </svg>
        ))}
      </div>

      <div className="flex items-center gap-2 text-xs">
        <button
          onClick={() => setRunId((n) => n + 1)}
          className="rounded-md border border-line px-2.5 py-1 text-muted hover:text-ink"
        >
          ↺ Replay
        </button>
        <button
          onClick={() => setShowNumbers((s) => !s)}
          className={`rounded-md border px-2.5 py-1 ${showNumbers ? "border-accent2 text-accent2" : "border-line text-muted"}`}
        >
          ① Numbers
        </button>
        <span className="text-muted">{total} strokes</span>
      </div>
    </div>
  );
}
