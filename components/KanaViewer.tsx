"use client";

// Reusable kana chart — used for both hiragana and katakana. Renders the
// classic gojūon grid (vowel columns × consonant rows), with Basic / Dakuten /
// Combination tabs and a tap-to-open detail card.

import { useMemo, useState } from "react";
import Link from "next/link";
import type { Kana } from "@/lib/types";
import { speakJa, canSpeak } from "@/lib/speak";
import { Icon } from "./Icon";
import { useMounted } from "@/lib/useMounted";
import { Modal } from "./Modal";

type Tab = "basic" | "dakuten" | "combos";

const BASIC_ROWS = ["a", "k", "s", "t", "n", "h", "m", "y", "r", "w", "n2"];
const DAKUTEN_ROWS = ["g", "z", "d", "b", "p"];
const YOON_ROWS = ["k", "s", "t", "n", "h", "m", "r", "g", "z", "b", "p"];

// vowel column index; supports 5-wide (a i u e o) and 3-wide (a u o) grids
function vowelIndex(romaji: string, cols: 5 | 3): number {
  if (romaji === "n") return 0;
  const v = romaji[romaji.length - 1];
  const map5: Record<string, number> = { a: 0, i: 1, u: 2, e: 3, o: 4 };
  const map3: Record<string, number> = { a: 0, u: 1, o: 2 };
  return (cols === 5 ? map5 : map3)[v] ?? 0;
}

export function KanaViewer({
  kind,
  data,
  note,
}: {
  kind: "hiragana" | "katakana";
  data: Kana[];
  note?: React.ReactNode;
}) {
  const [tab, setTab] = useState<Tab>("basic");
  const [sel, setSel] = useState<Kana | null>(null);
  const speech = useMounted() && canSpeak();

  const grid = useMemo(() => {
    if (tab === "basic") {
      const rows = data.filter((k) => k.type === "basic");
      return { cols: 5 as const, rows: BASIC_ROWS, get: byRow(rows, 5) };
    }
    if (tab === "dakuten") {
      const rows = data.filter((k) => k.type === "dakuten" || k.type === "handakuten");
      return { cols: 5 as const, rows: DAKUTEN_ROWS, get: byRow(rows, 5) };
    }
    const rows = data.filter((k) => k.type === "yoon");
    return { cols: 3 as const, rows: YOON_ROWS, get: byRow(rows, 3) };
  }, [tab, data]);

  return (
    <div>
      {/* tabs */}
      <div className="rise mb-4 flex gap-2">
        {(
          [
            ["basic", "Basic", "46"],
            ["dakuten", "Dakuten", "25"],
            ["combos", "Combos", "33"],
          ] as [Tab, string, string][]
        ).map(([id, label, count]) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`press flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition ${
              tab === id
                ? "border-accent bg-accent/10 text-accent shadow-[0_4px_16px_-6px] shadow-accent/40"
                : "border-line bg-surface text-muted hover:-translate-y-0.5 hover:text-ink"
            }`}
          >
            {label} <span className="opacity-50">{count}</span>
          </button>
        ))}
      </div>

      {/* grid — re-staggers on tab change so switching feels alive */}
      <div key={tab} className="stagger space-y-2">
        {grid.rows.map((row) => {
          const cells = grid.get(row);
          if (cells.every((c) => !c)) return null;
          return (
            <div
              key={row}
              className="grid gap-2"
              style={{ gridTemplateColumns: `repeat(${grid.cols}, minmax(0, 1fr))` }}
            >
              {cells.map((k, i) =>
                k ? (
                  <button
                    key={k.char}
                    onClick={() => setSel(k)}
                    className="group press flex flex-col items-center rounded-xl border border-line bg-surface py-2.5 transition hover:-translate-y-0.5 hover:border-accent hover:bg-surface2 hover:shadow-[0_8px_20px_-10px] hover:shadow-accent/40"
                  >
                    <span className="jp text-2xl leading-none transition-transform group-hover:scale-110 sm:text-3xl">{k.char}</span>
                    <span className="romaji mt-1 text-[11px]">{k.romaji}</span>
                  </button>
                ) : (
                  <div key={i} />
                )
              )}
            </div>
          );
        })}
      </div>

      {note && (
        <div className="rise mt-6 rounded-xl border border-line bg-surface p-4 text-sm leading-relaxed text-muted" style={{ "--rise-delay": "0.3s" } as React.CSSProperties}>
          {note}
        </div>
      )}

      {/* detail modal */}
      <Modal open={!!sel} onClose={() => setSel(null)}>
        {sel && (
          <div className="text-center">
            <div className="jp text-7xl leading-none">{sel.char}</div>
            <div className="romaji mt-3 text-2xl">{sel.romaji}</div>
            <div className="mt-1 text-xs uppercase tracking-widest text-muted">
              {sel.type === "yoon"
                ? "combination"
                : sel.type === "handakuten"
                  ? "handakuten"
                  : sel.type}{" "}
              {kind}
            </div>

            {sel.example && (
              <div className="mt-5 rounded-xl border border-line bg-surface2 p-4">
                <div className="text-xs uppercase tracking-widest text-muted">example word</div>
                <button
                  onClick={() => speakJa(sel.example!.word)}
                  className="jp mt-1 text-2xl hover:text-accent"
                  title="Hear it"
                >
                  <span className="inline-flex items-center gap-1.5">{sel.example.word} {speech && <Icon name="sound" size={15} />}</span>
                </button>
                <div className="romaji text-sm">{sel.example.romaji}</div>
                <div className="text-sm text-muted">{sel.example.meaning}</div>
              </div>
            )}

            <div className="mt-5 flex gap-2">
              {speech && (
                <button
                  onClick={() => speakJa(sel.char)}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-line bg-surface2 py-2.5 text-sm font-medium hover:border-accent"
                >
                  <Icon name="sound" size={15} /> Hear it
                </button>
              )}
              <Link
                href={`/draw?char=${encodeURIComponent(sel.char)}`}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-accent py-2.5 text-center text-sm font-semibold text-white"
              >
                <Icon name="pencil" size={15} /> Practice drawing
              </Link>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

// group a list into a lookup: row -> array of `cols` cells (kana or null)
function byRow(list: Kana[], cols: 5 | 3) {
  const map = new Map<string, (Kana | null)[]>();
  for (const k of list) {
    if (!map.has(k.row)) map.set(k.row, Array(cols).fill(null));
    map.get(k.row)![vowelIndex(k.romaji, cols)] = k;
  }
  return (row: string) => map.get(row) ?? Array(cols).fill(null);
}
