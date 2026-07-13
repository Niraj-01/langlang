"use client";

// Browse all German vocab by category (verbs / nouns / adjectives / adverbs).
// Each entry shows word + article (color-coded) + plural + meaning + example + tip.
// Tap to hear TTS. Modal detail view. Similar structure to KanjiViewer.

import { useMemo, useState } from "react";
import { speakDe, canSpeak } from "@/lib/speak";
import { useMounted } from "@/lib/useMounted";
import { Icon } from "./Icon";
import { ARTICLE_COLOR } from "./Lex";
import { Modal } from "./Modal";

interface VocabDeEntry {
  word: string;
  article?: "der" | "die" | "das";
  plural?: string;
  meaning: string;
  pos: string;
  example?: string;
  exampleMeaning?: string;
  tip?: string;
}

type PosTab = "all" | "noun" | "verb" | "adjective" | "adverb";

const TABS: { id: PosTab; label: string }[] = [
  { id: "all", label: "All" },
  { id: "noun", label: "Nouns" },
  { id: "verb", label: "Verbs" },
  { id: "adjective", label: "Adjectives" },
  { id: "adverb", label: "Adverbs" },
];

export function VocabDeBrowser({ data }: { data: VocabDeEntry[] }) {
  const [tab, setTab] = useState<PosTab>("all");
  const [search, setSearch] = useState("");
  const [sel, setSel] = useState<VocabDeEntry | null>(null);
  const speech = useMounted() && canSpeak();

  const filtered = useMemo(() => {
    let list = data;
    if (tab !== "all") list = list.filter((e) => e.pos === tab);
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      list = list.filter(
        (e) =>
          e.word.toLowerCase().includes(q) ||
          e.meaning.toLowerCase().includes(q)
      );
    }
    return list;
  }, [data, tab, search]);

  return (
    <div>
      {/* search */}
      <div className="rise relative mb-3">
        <Icon
          name="search"
          size={16}
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted"
        />
        <input
          type="text"
          placeholder="Search words…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-10 w-full rounded-xl border border-line bg-surface pl-9 pr-3 text-sm outline-none transition-shadow placeholder:text-muted focus:border-accent focus:shadow-[0_0_0_3px] focus:shadow-accent/20"
        />
      </div>

      {/* tabs */}
      <div className="rise mb-4 flex flex-wrap gap-1.5">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`press rounded-full border px-3 py-1 text-xs font-medium transition ${
              tab === t.id
                ? "border-accent bg-accent/10 text-accent"
                : "border-line bg-surface text-muted hover:-translate-y-0.5 hover:text-ink"
            }`}
          >
            {t.label}
          </button>
        ))}
        <span className="ml-auto self-center text-[10px] text-muted">{filtered.length} words</span>
      </div>

      {/* word list */}
      <div className="stagger space-y-2">
        {filtered.map((e) => (
          <button
            key={e.word + e.meaning}
            onClick={() => setSel(e)}
            className="tile-soft group flex w-full items-center gap-3 rounded-xl border border-line bg-surface p-3.5 text-left transition hover:-translate-y-0.5 hover:border-accent"
          >
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline gap-1.5 text-lg font-bold">
                {e.article && (
                  <span className={`text-sm ${ARTICLE_COLOR[e.article]}`}>{e.article}</span>
                )}
                <span>{e.word}</span>
              </div>
              <div className="mt-0.5 text-sm text-muted">{e.meaning}</div>
              <div className="mt-0.5 flex items-center gap-1.5 text-[10px] uppercase tracking-wide text-muted/60">
                <span className="rounded bg-surface2 px-1.5 py-0.5">{e.pos}</span>
                {e.plural && (
                  <>
                    <span>·</span>
                    <span>
                      pl. <span className="text-die">die</span> {e.plural}
                    </span>
                  </>
                )}
              </div>
            </div>
            {speech && (
              <Icon
                name="sound"
                size={15}
                className="shrink-0 text-muted transition group-hover:text-accent"
              />
            )}
          </button>
        ))}
        {filtered.length === 0 && (
          <div className="py-12 text-center text-sm text-muted">No words match your search.</div>
        )}
      </div>

      {/* detail modal */}
      <Modal open={!!sel} onClose={() => setSel(null)}>
        {sel && (
          <div className="text-center">
            <div className="flex items-baseline justify-center gap-2 text-4xl font-bold">
              {sel.article && (
                <span className={`text-2xl ${ARTICLE_COLOR[sel.article]}`}>{sel.article}</span>
              )}
              <span>{sel.word}</span>
            </div>
            <div className="mt-1 text-base text-muted">{sel.meaning}</div>
            <div className="mt-1 flex items-center justify-center gap-2 text-xs uppercase tracking-widest text-muted/60">
              <span>{sel.pos}</span>
              {sel.plural && (
                <>
                  <span>·</span>
                  <span>
                    pl. <span className="text-die">die</span> {sel.plural}
                  </span>
                </>
              )}
            </div>

            {sel.example && (
              <div className="mt-5 rounded-xl border border-line bg-surface2 p-4 text-left">
                <div className="text-xs uppercase tracking-widest text-muted">example</div>
                <button
                  onClick={() => speakDe(sel.example!)}
                  className="mt-1 text-lg font-medium hover:text-accent"
                >
                  <span className="inline-flex items-center gap-1.5">
                    {sel.example} {speech && <Icon name="sound" size={13} />}
                  </span>
                </button>
                {sel.exampleMeaning && (
                  <div className="text-sm text-muted">{sel.exampleMeaning}</div>
                )}
              </div>
            )}

            {sel.tip && (
              <div className="mt-4 rounded-xl border border-accent/30 bg-accent/5 p-3 text-left text-sm text-muted">
                <Icon name="bulb" size={13} className="mr-1 inline text-accent" />
                {sel.tip}
              </div>
            )}

            <div className="mt-5 flex gap-2">
              {speech && (
                <button
                  onClick={() => speakDe(sel.word)}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-line bg-surface2 py-2.5 text-sm font-medium hover:border-accent"
                >
                  <Icon name="sound" size={15} /> Hear it
                </button>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
