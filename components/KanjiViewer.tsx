"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import type { Kanji } from "@/lib/types";
import { speakJa } from "@/lib/speak";
import { useApp, toggleFavorite } from "@/lib/store";
import { Modal } from "./Modal";

const CATEGORIES: { id: string; label: string }[] = [
  { id: "all", label: "All" },
  { id: "numbers", label: "Numbers" },
  { id: "time", label: "Time" },
  { id: "people", label: "People" },
  { id: "body", label: "Body" },
  { id: "nature", label: "Nature" },
  { id: "directions", label: "Directions" },
  { id: "verbs", label: "Verbs" },
  { id: "adjectives", label: "Adjectives" },
  { id: "places", label: "Places" },
  { id: "other", label: "Other" },
];

export function KanjiViewer({ data }: { data: Kanji[] }) {
  const [cat, setCat] = useState("all");
  const [q, setQ] = useState("");
  const [sel, setSel] = useState<Kanji | null>(null);
  const favorites = useApp().favorites;
  const params = useSearchParams();

  // deep-link: /kanji?focus=木 opens that kanji (e.g. from the radicals page)
  const focus = params.get("focus");
  useEffect(() => {
    if (!focus) return;
    const k = data.find((x) => x.kanji === focus);
    if (k) setSel(k);
  }, [focus, data]);

  const list = useMemo(() => {
    const query = q.trim().toLowerCase();
    return data.filter((k) => {
      if (cat !== "all" && k.category !== cat) return false;
      if (!query) return true;
      return (
        k.meaning.toLowerCase().includes(query) ||
        k.kanji.includes(query) ||
        k.examples.some(
          (e) => e.romaji.toLowerCase().includes(query) || e.meaning.toLowerCase().includes(query)
        ) ||
        [...k.onyomi, ...k.kunyomi].some((r) => r.toLowerCase().includes(query))
      );
    });
  }, [data, cat, q]);

  return (
    <div>
      {/* search */}
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search by meaning or romaji (e.g. 'water', 'taberu')…"
        className="rise mb-3 w-full rounded-lg border border-line bg-surface px-3 py-2.5 text-sm outline-none transition-shadow placeholder:text-muted focus:border-accent focus:shadow-[0_0_0_3px] focus:shadow-accent/20"
      />

      {/* category chips */}
      <div className="rise mb-4 flex flex-wrap gap-1.5" style={{ "--rise-delay": "0.06s" } as React.CSSProperties}>
        {CATEGORIES.map((c) => (
          <button
            key={c.id}
            onClick={() => setCat(c.id)}
            className={`press rounded-full border px-3 py-1 text-xs font-medium transition ${
              cat === c.id
                ? "border-accent bg-accent/10 text-accent"
                : "border-line bg-surface text-muted hover:-translate-y-0.5 hover:text-ink"
            }`}
          >
            {c.label}
          </button>
        ))}
      </div>

      {list.length === 0 ? (
        <div className="py-16 text-center text-sm text-muted">
          No kanji match “{q}”.
        </div>
      ) : (
        <div key={`${cat}:${q}`} className="stagger grid grid-cols-3 gap-2 sm:grid-cols-5">
          {list.map((k) => (
            <button
              key={k.kanji}
              onClick={() => setSel(k)}
              className="group press flex flex-col items-center rounded-xl border border-line bg-surface py-3 transition hover:-translate-y-0.5 hover:border-accent hover:bg-surface2 hover:shadow-[0_8px_20px_-10px] hover:shadow-accent/40"
            >
              <span className="jp text-3xl leading-none transition-transform group-hover:scale-110 sm:text-4xl">{k.kanji}</span>
              <span className="mt-1.5 line-clamp-1 px-1 text-[10px] text-muted">
                {k.meaning.split(",")[0]}
              </span>
            </button>
          ))}
        </div>
      )}

      <Modal open={!!sel} onClose={() => setSel(null)}>
        {sel && (
          <div>
            <div className="flex items-start gap-4">
              <button onClick={() => speakJa(sel.kanji)} className="jp text-7xl leading-none hover:text-accent">
                {sel.kanji}
              </button>
              <div className="flex-1 pt-1">
                <div className="text-lg font-semibold">{sel.meaning}</div>
                <div className="mt-1 flex items-center gap-2 text-xs uppercase tracking-widest text-muted">
                  <span className="rounded border border-accent/60 px-1.5 py-0.5 text-accent">
                    JLPT N5
                  </span>
                  {sel.strokes} strokes · {sel.category}
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <Link
                    href={`/draw?char=${encodeURIComponent(sel.kanji)}`}
                    className="press inline-block rounded-lg bg-accent px-3 py-1.5 text-xs font-semibold text-white"
                  >
                    ✎ Practice drawing
                  </Link>
                  <button
                    onClick={() => toggleFavorite(`kanji:${sel.kanji}`)}
                    title={favorites.includes(`kanji:${sel.kanji}`) ? "Remove from saved" : "Save"}
                    className={`press rounded-lg border px-2.5 py-1 text-base transition-colors ${
                      favorites.includes(`kanji:${sel.kanji}`)
                        ? "border-accent text-accent"
                        : "border-line text-muted hover:text-accent"
                    }`}
                  >
                    {favorites.includes(`kanji:${sel.kanji}`) ? "♥" : "♡"}
                  </button>
                </div>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2">
              <Reading label="On'yomi" hint="Chinese-derived" values={sel.onyomi} className="jp" />
              <Reading label="Kun'yomi" hint="Japanese-native" values={sel.kunyomi} className="jp" />
            </div>

            {sel.mnemonic && (
              <div className="mt-3 rounded-lg border border-accent/30 bg-accent/5 p-3">
                <div className="text-[10px] uppercase tracking-widest text-muted">
                  remember it {sel.components && <span className="opacity-60">· {sel.components}</span>}
                </div>
                <div className="mt-1 text-sm leading-snug">{sel.mnemonic}</div>
              </div>
            )}

            <div className="mt-4">
              <div className="mb-1 text-xs uppercase tracking-widest text-muted">example words</div>
              <div className="space-y-1.5">
                {sel.examples.map((e) => (
                  <button
                    key={e.word}
                    onClick={() => speakJa(e.word)}
                    className="flex w-full items-baseline gap-2 rounded-lg border border-line bg-surface2 px-3 py-2 text-left hover:border-accent"
                  >
                    <span className="jp text-lg">{e.word}</span>
                    <span className="romaji text-sm">{e.romaji}</span>
                    <span className="ml-auto text-sm text-muted">{e.meaning}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

function Reading({
  label,
  hint,
  values,
  className = "",
}: {
  label: string;
  hint: string;
  values: string[];
  className?: string;
}) {
  return (
    <div className="rounded-lg border border-line bg-surface2 p-3">
      <div className="text-[10px] uppercase tracking-widest text-muted">
        {label} <span className="opacity-60">· {hint}</span>
      </div>
      <div className={`mt-1 text-lg ${className}`}>
        {values.length ? values.join("、") : <span className="text-sm text-muted">—</span>}
      </div>
    </div>
  );
}
