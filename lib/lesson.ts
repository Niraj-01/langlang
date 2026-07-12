// Lesson builder — Duolingo-style exercise sessions over a small word set.
// Pure functions: the Lesson component owns hearts/XP/state.

import type { Lang, VocabEntry } from "./types";

export interface LessonWord {
  word: string;
  meaning: string;
  reading?: string;
  article?: "der" | "die" | "das";
  tip?: string; // usage / grammar note, surfaced after a miss
  mnemonic?: string; // memory hook, surfaced after a miss
}

export type Exercise =
  | { kind: "mc"; word: LessonWord; options: string[]; answer: number } // word → pick meaning
  | { kind: "rmc"; word: LessonWord; options: LessonWord[]; answer: number } // meaning → pick word
  | { kind: "type"; word: LessonWord } // word → type the meaning
  | { kind: "match"; pairs: LessonWord[] }; // tap word ↔ meaning pairs

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function distractors<T>(pool: T[], not: (t: T) => boolean, n: number): T[] {
  return shuffle(pool.filter(not)).slice(0, n);
}

/** ~1 exercise per word plus a match round per 4 words, shuffled but ending on match. */
export function buildLesson(words: LessonWord[], pool: LessonWord[]): Exercise[] {
  const kinds: ("mc" | "rmc" | "type")[] = ["mc", "rmc", "type"];
  const perWord: Exercise[] = shuffle(words).map((w, i) => {
    const kind = kinds[i % kinds.length];
    if (kind === "type") return { kind, word: w };
    if (kind === "mc") {
      const opts = shuffle([
        w.meaning,
        ...distractors(pool, (p) => p.meaning !== w.meaning, 3).map((p) => p.meaning),
      ]);
      return { kind, word: w, options: opts, answer: opts.indexOf(w.meaning) };
    }
    const opts = shuffle([w, ...distractors(pool, (p) => p.word !== w.word, 3)]);
    return { kind: "rmc", word: w, options: opts, answer: opts.findIndex((o) => o.word === w.word) };
  });

  const out = shuffle(perWord);
  for (let i = 0; i + 4 <= words.length; i += 4) {
    out.push({ kind: "match", pairs: shuffle(words).slice(i, i + 4) });
  }
  return out;
}

/** Forgiving typed-answer check: any comma-separated meaning, loose match. */
export function typedCorrect(input: string, meaning: string): boolean {
  const norm = (s: string) =>
    s.toLowerCase().replace(/\(.*?\)/g, "").replace(/[^a-zä-üß\s]/gi, "").trim();
  const said = norm(input);
  if (!said) return false;
  return meaning
    .split(/[,;/]/)
    .map(norm)
    .filter(Boolean)
    .some((m) => m === said || m.includes(said) || said.includes(m));
}

export function toLessonWords(entries: VocabEntry[]): LessonWord[] {
  return entries.map((e) => ({
    word: e.word,
    meaning: e.meaning,
    reading: e.reading,
    article: e.article,
    tip: e.tip,
    mnemonic: e.mnemonic,
  }));
}

export const HEARTS = 5;
export const XP_PER_CORRECT = 10;

export function accuracyLabel(pct: number, lang: Lang): string {
  if (pct >= 100) return lang === "ja" ? "完璧! flawless" : "Perfekt! flawless";
  if (pct >= 80) return "sharp.";
  if (pct >= 60) return "solid — the feed will patch the rest";
  return "rough round — mistakes were saved for review";
}
