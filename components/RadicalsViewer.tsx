"use client";

// Radicals — the building blocks of kanji (the WaniKani idea: learn the parts
// first, then every kanji is a story made of pieces you already know). Tap one
// to see its mnemonic and the kanji in our set built from it.

import { useState } from "react";
import Link from "next/link";
import type { Radical } from "@/lib/types";
import { speakJa } from "@/lib/speak";
import { Modal } from "./Modal";

export function RadicalsViewer({ data }: { data: Radical[] }) {
  const [sel, setSel] = useState<Radical | null>(null);

  return (
    <div>
      <Link
        href="/kanji"
        className="rise mb-3 inline-flex items-center gap-1 text-xs font-semibold text-muted transition-colors hover:text-accent"
      >
        ← Back to Kanji
      </Link>

      <div className="stagger grid grid-cols-3 gap-2 sm:grid-cols-5">
        {data.map((r) => (
          <button
            key={r.radical}
            onClick={() => setSel(r)}
            className="group press flex flex-col items-center rounded-xl border border-line bg-surface py-3 transition hover:-translate-y-0.5 hover:border-accent hover:bg-surface2 hover:shadow-[0_8px_20px_-10px] hover:shadow-accent/40"
          >
            <span className="jp text-3xl leading-none transition-transform group-hover:scale-110 sm:text-4xl">
              {r.radical}
            </span>
            <span className="mt-1.5 line-clamp-1 px-1 text-[10px] text-muted">{r.meaning}</span>
          </button>
        ))}
      </div>

      <Modal open={!!sel} onClose={() => setSel(null)}>
        {sel && (
          <div>
            <div className="flex items-start gap-4">
              <span className="jp text-7xl leading-none">{sel.radical}</span>
              <div className="flex-1 pt-1">
                <div className="text-lg font-semibold">{sel.meaning}</div>
                <div className="mt-1 flex items-center gap-2 text-xs uppercase tracking-widest text-muted">
                  <span className="rounded border border-accent/60 px-1.5 py-0.5 text-accent">radical</span>
                  {sel.forms.length > 0 && <span className="jp">also written {sel.forms.join(" ")}</span>}
                </div>
              </div>
            </div>

            <div className="mt-4 rounded-lg border border-accent/30 bg-accent/5 p-3">
              <div className="text-[10px] uppercase tracking-widest text-muted">remember it</div>
              <div className="mt-1 text-sm leading-snug">{sel.mnemonic}</div>
            </div>

            <div className="mt-4">
              <div className="mb-1 text-xs uppercase tracking-widest text-muted">
                builds these kanji <span className="opacity-60">· {sel.kanji.length}</span>
              </div>
              {sel.kanji.length ? (
                <div className="flex flex-wrap gap-1.5">
                  {sel.kanji.map((k) => (
                    <Link
                      key={k}
                      href={`/kanji?focus=${encodeURIComponent(k)}`}
                      onClick={() => speakJa(k)}
                      className="jp flex h-11 w-11 items-center justify-center rounded-lg border border-line bg-surface2 text-2xl transition hover:border-accent hover:text-accent"
                    >
                      {k}
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-muted">—</div>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
