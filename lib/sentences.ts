// i+1 sentence pool — real Tatoeba sentences (CC BY 2.0 FR), filtered OFFLINE
// by scripts/gen-sentences.mjs so that every content token maps to a seed-vocab
// entry (trivial glue — particles, auxiliaries, names, punctuation — carries
// seedIndex null). A sentence is servable when the learner knows every content
// word except exactly ONE, and that one is either due for review or the
// current new word: comprehensible input with a single learning target.
//
// Data is local JSON shipped in the repo — the review path never touches the
// network for sentences.

import sentencesJa from "@/data/sentences_ja.json";
import sentencesDe from "@/data/sentences_de.json";
import { SEED, dealIndexAt } from "./seed";
import type { AppState, Card, Lang, SentenceData } from "./types";

export const SENTENCES: Record<Lang, SentenceData[]> = {
  ja: sentencesJa as SentenceData[],
  de: sentencesDe as SentenceData[],
};

/** Same bar the Path uses for mastery stars: a word is "known" at 7d stability. */
export const KNOWN_STABILITY_DAYS = 7;

export interface SentencePick {
  sentenceIdx: number;
  unknownSeedIndex: number;
}

/**
 * Every sentence currently servable as i+1, with its single unknown word.
 * Pure (state in, picks out) so the invariant is directly testable.
 *
 * A seed word referenced by the sentence must be one of:
 *  - KNOWN: its card exists with stability >= KNOWN_STABILITY_DAYS
 *  - THE unknown (at most one, distinct): its card is due now, or it is the
 *    current new word (state.newIndex[lang]) not yet in the deck
 * Anything else (unseen future words, learning-phase cards that aren't due)
 * disqualifies the sentence.
 */
export function qualifying(
  sentences: SentenceData[],
  state: Pick<AppState, "cards" | "newIndex">,
  lang: Lang,
  now = Date.now()
): SentencePick[] {
  const byWord = new Map<string, Card>();
  for (const c of state.cards) if (c.lang === lang) byWord.set(c.word, c);
  const newIdx = state.newIndex[lang];
  const seed = SEED[lang];

  const out: SentencePick[] = [];
  for (let i = 0; i < sentences.length; i++) {
    const distinct = new Set<number>();
    for (const t of sentences[i].tokens) if (t.seedIndex !== null) distinct.add(t.seedIndex);

    let unknown: number | null = null;
    let ok = distinct.size > 0;
    for (const si of distinct) {
      const entry = seed[si];
      const card = entry ? byWord.get(entry.word) : undefined;
      if (card && card.fsrs.stability >= KNOWN_STABILITY_DAYS) continue; // known
      const isDue = !!card && card.fsrs.due <= now;
      // the upcoming new word is the one DEALT at the pointer, which inside a
      // unit is frequency-ordered (lib/seed.ts DEAL_ORDER)
      const isCurrentNew = !card && si === dealIndexAt(lang, newIdx);
      if ((isDue || isCurrentNew) && unknown === null) {
        unknown = si;
        continue;
      }
      ok = false;
      break;
    }
    if (ok && unknown !== null) out.push({ sentenceIdx: i, unknownSeedIndex: unknown });
  }
  return out;
}

/** Random servable sentence for the feed, or null (feed falls through). */
export function pickSentence(
  state: Pick<AppState, "cards" | "newIndex">,
  lang: Lang,
  now = Date.now()
): SentencePick | null {
  const q = qualifying(SENTENCES[lang], state, lang, now);
  if (q.length === 0) return null;
  return q[Math.floor(Math.random() * q.length)];
}
