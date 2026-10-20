"use client";

// Japanese grammar reference: the JLPT N5 patterns in teaching order, one
// accordion row each. Open a row for the rule (max 2 sentences), the forms,
// tappable example sentences (furigana follows the app-wide toggle), and a
// short fill-the-blank practice run built from that pattern's tagged drills —
// the same drills the feed and lessons deal.

import { useEffect, useState } from "react";
import type { GrammarItem, GrammarPoint } from "@/lib/types";
import { fillReading, stripRuby } from "@/lib/grammar";
import { speakJa, canSpeak } from "@/lib/speak";
import { useMounted } from "@/lib/useMounted";
import { useApp, toggleFurigana } from "@/lib/store";
import { RubyText } from "./Lex";
import { Icon } from "./Icon";

const LABEL = "text-[10px] font-bold uppercase tracking-[2px] text-muted";
const BLANK = "＿";
// English prose with Japanese inline: Inter for Latin, Noto Sans JP for the rest
const MIXED = { fontFamily: "var(--font-inter), var(--font-jp)" };

export function GrammarGuide({
  points,
  drills,
}: {
  points: GrammarPoint[];
  drills: Record<string, GrammarItem[]>;
}) {
  const { furigana } = useApp();
  const speech = useMounted() && canSpeak();
  const [open, setOpen] = useState<string | null>(null);

  // deep link: /grammar#te-form opens that pattern (on load and on hash change)
  useEffect(() => {
    const sync = () => {
      const id = decodeURIComponent(window.location.hash.slice(1));
      if (points.some((p) => p.id === id)) setOpen(id);
    };
    sync();
    window.addEventListener("hashchange", sync);
    return () => window.removeEventListener("hashchange", sync);
  }, [points]);

  useEffect(() => {
    if (open) document.getElementById(open)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [open]);

  const toggle = (id: string | null) => {
    setOpen(id);
    history.replaceState(null, "", id ? `#${id}` : window.location.pathname);
  };

  return (
    <div>
      <div className="rise mb-3 flex items-center justify-between gap-3">
        <div className={LABEL}>
          {points.length} patterns · JLPT N5
        </div>
        <button
          onClick={toggleFurigana}
          aria-pressed={furigana}
          className={`press flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition ${
            furigana ? "border-accent bg-accent/10 text-accent" : "border-line bg-surface text-muted hover:text-ink"
          }`}
        >
          <span className="jp text-sm leading-none">あ</span>
          Furigana {furigana ? "on" : "off"}
        </button>
      </div>

      <ol className="stagger space-y-2">
        {points.map((p, i) => {
          const isOpen = open === p.id;
          const next = points[i + 1];
          return (
            <li
              key={p.id}
              id={p.id}
              className={`scroll-mt-3 rounded-xl border bg-surface transition-colors ${
                isOpen ? "border-accent/60" : "border-line"
              }`}
            >
              <button
                onClick={() => toggle(isOpen ? null : p.id)}
                aria-expanded={isOpen}
                className="flex w-full items-center gap-3 p-4 text-left"
              >
                <span
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs font-bold tabular-nums ${
                    isOpen ? "border-accent bg-accent/10 text-accent" : "border-line text-muted"
                  }`}
                >
                  {i + 1}
                </span>
                <span className="min-w-0 flex-1">
                  <RubyText text={p.title} furigana={furigana} className="jp block text-lg leading-snug" />
                  <span className="mt-0.5 block text-sm text-muted">{p.name}</span>
                </span>
                <Icon
                  name="arrowRight"
                  size={16}
                  className={`shrink-0 text-muted transition-transform ${isOpen ? "rotate-90 text-accent" : ""}`}
                />
              </button>

              {isOpen && (
                <div className="rise space-y-5 border-t border-line px-4 pb-4 pt-4">
                  <div>
                    <div className="romaji text-xs">{p.romaji}</div>
                    <RubyText
                      text={p.pattern}
                      furigana={furigana}
                      className="jp mt-2 block rounded-lg bg-surface2 px-3 py-2 text-base leading-loose"
                    />
                    <p className="mt-3 text-[15px] leading-loose" style={MIXED}>
                      <RubyText text={p.explain} furigana={furigana} />
                    </p>
                  </div>

                  <section>
                    <div className={`${LABEL} mb-2`}>Forms</div>
                    <div className="divide-y divide-line rounded-lg border border-line">
                      {p.forms.map((f, j) => (
                        <div key={j} className="flex items-baseline gap-3 px-3 py-2">
                          <span className="w-20 shrink-0 text-[10px] font-semibold uppercase tracking-wide text-muted">
                            {f.label}
                          </span>
                          <span className="min-w-0 flex-1">
                            <RubyText text={f.ja} furigana={furigana} className="jp block text-base leading-loose" />
                            <span className="romaji block text-xs">{f.romaji}</span>
                            <span className="block text-xs text-muted">{f.en}</span>
                          </span>
                        </div>
                      ))}
                    </div>
                  </section>

                  <section>
                    <div className={`${LABEL} mb-2`}>Examples</div>
                    <div className="space-y-2">
                      {p.examples.map((ex, j) => (
                        <button
                          key={j}
                          onClick={() => speech && speakJa(stripRuby(ex.ja))}
                          className="group block w-full rounded-lg border-l-4 border-line bg-surface2 px-3 py-2 text-left transition-colors hover:border-accent"
                        >
                          <span className="flex items-start gap-2">
                            <RubyText text={ex.ja} furigana={furigana} className="jp min-w-0 flex-1 text-lg leading-loose" />
                            {speech && (
                              <Icon name="sound" size={15} className="mt-2 shrink-0 text-muted transition group-hover:text-accent" />
                            )}
                          </span>
                          <span className="romaji block text-xs">{ex.romaji}</span>
                          <span className="block text-sm text-muted">{ex.en}</span>
                        </button>
                      ))}
                    </div>
                  </section>

                  {(drills[p.id] ?? []).length > 0 && (
                    <section>
                      <div className={`${LABEL} mb-2`}>Practice</div>
                      <Practice key={p.id} items={drills[p.id]} furigana={furigana} speech={speech} />
                    </section>
                  )}

                  {next && (
                    <button
                      onClick={() => toggle(next.id)}
                      className="press flex w-full items-center justify-between rounded-lg border border-line px-3 py-2.5 text-sm text-muted transition hover:border-accent hover:text-accent"
                    >
                      <span>
                        Next: <span className="jp text-ink">{stripRuby(next.title)}</span>
                      </span>
                      <Icon name="arrowRight" size={15} />
                    </button>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}

/** One-at-a-time fill-the-blank run over a pattern's drills, in data order. */
function Practice({ items, furigana, speech }: { items: GrammarItem[]; furigana: boolean; speech: boolean }) {
  const [idx, setIdx] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [correct, setCorrect] = useState(0);
  const [done, setDone] = useState(false);

  if (done) {
    return (
      <div className="rise rounded-xl border border-line bg-surface2 p-5 text-center">
        <div className="text-3xl font-bold text-accent">
          {correct}/{items.length}
        </div>
        <div className="mt-1 text-sm text-muted">
          {correct === items.length ? "All correct. On to the next pattern." : "Re-read the rule above, then try once more."}
        </div>
        <button
          onClick={() => {
            setIdx(0);
            setPicked(null);
            setCorrect(0);
            setDone(false);
          }}
          className="press mt-4 rounded-xl border border-line px-5 py-2 text-sm font-semibold transition hover:border-accent hover:text-accent"
        >
          Practice again
        </button>
      </div>
    );
  }

  const item = items[idx];
  const answered = picked !== null;
  const ok = picked === item.answer;
  const [before, after] = item.prompt.split(BLANK);

  const pick = (i: number) => {
    if (answered) return;
    setPicked(i);
    if (i === item.answer) {
      setCorrect((c) => c + 1);
      if (speech) speakJa(item.prompt.replace(BLANK, item.options[item.answer]));
    }
  };

  const next = () => {
    if (idx + 1 >= items.length) return setDone(true);
    setIdx(idx + 1);
    setPicked(null);
  };

  return (
    <div className="rounded-xl border border-line bg-surface2 p-4">
      <div className="mb-3 flex justify-between text-[10px] uppercase tracking-widest text-muted">
        <span className="tabular-nums">
          {idx + 1} / {items.length}
        </span>
        <span className="text-good">{correct} correct</span>
      </div>

      <div className="jp text-xl font-bold leading-relaxed">
        {before}
        <span
          className={`mx-0.5 inline-block min-w-[2.5em] border-b-2 px-1 text-center ${
            answered ? (ok ? "border-good text-good" : "border-accent text-accent") : "border-muted text-transparent"
          }`}
        >
          {answered ? item.options[item.answer] : "＿"}
        </span>
        {after}
      </div>
      {furigana && item.promptReading && (
        <div className="jp mt-1 text-sm text-muted">{fillReading(item, answered ? item.answer : null)}</div>
      )}
      <div className="mt-1 text-sm text-muted">{item.translation}</div>

      <div className="mt-4 grid grid-cols-2 gap-2">
        {item.options.map((opt, i) => {
          let cls = "border-line bg-surface hover:border-accent";
          if (answered) {
            if (i === item.answer) cls = "border-good bg-good/10 text-good";
            else if (i === picked) cls = "border-accent bg-accent/10 text-accent";
            else cls = "border-line bg-surface opacity-40";
          }
          return (
            <button
              key={i}
              onClick={() => pick(i)}
              disabled={answered}
              className={`press jp min-h-11 rounded-xl border-2 px-3 py-2 text-base font-bold transition ${cls}`}
            >
              {opt}
            </button>
          );
        })}
      </div>

      {answered && (
        <div className="rise mt-4">
          <div className={`flex items-center gap-1.5 text-sm font-bold ${ok ? "text-good" : "text-accent"}`}>
            <Icon name={ok ? "check" : "x"} size={16} />
            {ok ? "Correct" : "Not quite"}
          </div>
          <p className="mt-1 flex items-start gap-1.5 text-sm text-muted" style={MIXED}>
            <Icon name="bulb" size={14} className="mt-0.5 shrink-0 text-accent" />
            <span>{item.note}</span>
          </p>
          <button
            onClick={next}
            className="press mt-3 w-full rounded-xl bg-accent py-2.5 text-sm font-semibold text-white transition hover:brightness-110"
          >
            {idx + 1 < items.length ? "Next" : "See score"}
          </button>
        </div>
      )}
    </div>
  );
}
