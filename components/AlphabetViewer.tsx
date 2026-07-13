"use client";

// German special characters and letter combinations viewer.
// Tabs for Special Characters (ä ö ü ß) and Combos (ch, sch, ei, ie, etc.)
// Tap to hear pronunciation + see example word.

import { useState } from "react";
import { speakDe, canSpeak } from "@/lib/speak";
import { useMounted } from "@/lib/useMounted";
import { Icon } from "./Icon";
import { Modal } from "./Modal";

interface SpecialChar {
  char: string;
  name: string;
  ipa: string;
  desc: string;
  example: string;
  exampleMeaning: string;
}
interface Combo {
  combo: string;
  ipa: string;
  desc: string;
  example: string;
  exampleMeaning: string;
}
interface AlphabetData {
  special: SpecialChar[];
  combos: Combo[];
  tips: string[];
}

type Tab = "special" | "combos" | "tips";

export function AlphabetViewer({ data }: { data: AlphabetData }) {
  const [tab, setTab] = useState<Tab>("special");
  const [selSpecial, setSelSpecial] = useState<SpecialChar | null>(null);
  const [selCombo, setSelCombo] = useState<Combo | null>(null);
  const speech = useMounted() && canSpeak();

  return (
    <div>
      {/* tabs */}
      <div className="rise mb-4 flex gap-2">
        {(
          [
            ["special", "Special", `${data.special.length}`],
            ["combos", "Combos", `${data.combos.length}`],
            ["tips", "Tips", `${data.tips.length}`],
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

      {/* special characters */}
      {tab === "special" && (
        <div key="special" className="stagger grid grid-cols-2 gap-3 sm:grid-cols-4">
          {data.special.map((s) => (
            <button
              key={s.char}
              onClick={() => setSelSpecial(s)}
              className="group press flex flex-col items-center rounded-xl border border-line bg-surface py-5 transition hover:-translate-y-0.5 hover:border-accent hover:bg-surface2 hover:shadow-[0_8px_20px_-10px] hover:shadow-accent/40"
            >
              <span className="text-4xl font-bold leading-none transition-transform group-hover:scale-110 sm:text-5xl">
                {s.char}
              </span>
              <span className="mt-2 text-xs text-muted">{s.name}</span>
              <span className="mt-0.5 text-[10px] font-mono text-accent">{s.ipa}</span>
            </button>
          ))}
        </div>
      )}

      {/* combos */}
      {tab === "combos" && (
        <div key="combos" className="stagger space-y-2">
          {data.combos.map((c) => (
            <button
              key={c.combo}
              onClick={() => setSelCombo(c)}
              className="tile-soft group flex w-full items-center gap-4 rounded-xl border border-line bg-surface p-4 text-left transition hover:-translate-y-0.5 hover:border-accent"
            >
              <span className="min-w-[56px] text-center text-2xl font-bold text-accent">
                {c.combo}
              </span>
              <div className="min-w-0 flex-1">
                <div className="text-sm">{c.desc}</div>
                <div className="mt-0.5 flex items-center gap-2 text-xs text-muted">
                  <span className="font-mono">{c.ipa}</span>
                  <span>·</span>
                  <span className="italic">{c.example}</span>
                </div>
              </div>
              {speech && (
                <Icon name="sound" size={15} className="shrink-0 text-muted transition group-hover:text-accent" />
              )}
            </button>
          ))}
        </div>
      )}

      {/* tips */}
      {tab === "tips" && (
        <div key="tips" className="stagger space-y-3">
          {data.tips.map((tip, i) => (
            <div
              key={i}
              className="rise rounded-xl border border-line bg-surface p-4 text-sm leading-relaxed text-muted"
              style={{ "--rise-delay": `${i * 0.06}s` } as React.CSSProperties}
            >
              <span className="mr-2 inline-flex h-5 w-5 items-center justify-center rounded-full bg-accent/20 text-[10px] font-bold text-accent">
                {i + 1}
              </span>
              {tip}
            </div>
          ))}
        </div>
      )}

      {/* special character modal */}
      <Modal open={!!selSpecial} onClose={() => setSelSpecial(null)}>
        {selSpecial && (
          <div className="text-center">
            <div className="text-7xl font-bold leading-none">{selSpecial.char}</div>
            <div className="mt-2 text-lg">{selSpecial.name}</div>
            <div className="mt-1 font-mono text-sm text-accent">{selSpecial.ipa}</div>
            <div className="mt-4 rounded-xl border border-line bg-surface2 p-4 text-sm leading-relaxed text-muted">
              {selSpecial.desc}
            </div>

            <div className="mt-4 rounded-xl border border-line bg-surface2 p-4">
              <div className="text-xs uppercase tracking-widest text-muted">example word</div>
              <button
                onClick={() => speakDe(selSpecial.example)}
                className="mt-1 text-2xl font-bold hover:text-accent"
              >
                <span className="inline-flex items-center gap-1.5">
                  {selSpecial.example} {speech && <Icon name="sound" size={15} />}
                </span>
              </button>
              <div className="text-sm text-muted">{selSpecial.exampleMeaning}</div>
            </div>

            {speech && (
              <button
                onClick={() => speakDe(selSpecial.example)}
                className="mt-4 flex w-full items-center justify-center gap-1.5 rounded-lg bg-accent py-2.5 text-sm font-semibold text-white"
              >
                <Icon name="sound" size={15} /> Hear it
              </button>
            )}
          </div>
        )}
      </Modal>

      {/* combo modal */}
      <Modal open={!!selCombo} onClose={() => setSelCombo(null)}>
        {selCombo && (
          <div className="text-center">
            <div className="text-5xl font-bold leading-none text-accent">{selCombo.combo}</div>
            <div className="mt-2 font-mono text-sm">{selCombo.ipa}</div>
            <div className="mt-4 rounded-xl border border-line bg-surface2 p-4 text-sm leading-relaxed text-muted">
              {selCombo.desc}
            </div>

            <div className="mt-4 rounded-xl border border-line bg-surface2 p-4">
              <div className="text-xs uppercase tracking-widest text-muted">example</div>
              <button
                onClick={() => speakDe(selCombo.example.split(" / ")[0])}
                className="mt-1 text-2xl font-bold hover:text-accent"
              >
                <span className="inline-flex items-center gap-1.5">
                  {selCombo.example} {speech && <Icon name="sound" size={15} />}
                </span>
              </button>
              <div className="text-sm text-muted">{selCombo.exampleMeaning}</div>
            </div>

            {speech && (
              <button
                onClick={() => speakDe(selCombo.example.split(" / ")[0])}
                className="mt-4 flex w-full items-center justify-center gap-1.5 rounded-lg bg-accent py-2.5 text-sm font-semibold text-white"
              >
                <Icon name="sound" size={15} /> Hear it
              </button>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
