// Feed algorithm v1 — weighted queue with pacing rules:
//  - due SRS reviews get the biggest share (debt paid invisibly)
//  - never more than 2 reviews (hard cards) in a row
//  - after a fail, the next card must be an easy win
//  - occasional status card mid-scroll

import type { AppState, FeedItem, GrammarItem, Lang } from "./types";
import { SEED } from "./seed";
import { dueCards, pickSpeakTarget } from "./store";
import grammarJa from "@/data/grammar_ja.json";
import grammarDe from "@/data/grammar_de.json";

const GRAMMAR: Record<Lang, GrammarItem[]> = {
  ja: grammarJa as GrammarItem[],
  de: grammarDe as GrammarItem[],
};

function buildGrammar(lang: Lang): FeedItem {
  const pool = GRAMMAR[lang];
  const item = pool[Math.floor(Math.random() * pool.length)];
  return { kind: "grammar", id: uid(), item };
}

let counter = 0;
const uid = () => `f${++counter}`;

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function buildMeme(state: AppState, lang: Lang): FeedItem | null {
  const pool = state.cards.filter((c) => c.lang === lang && c.type !== "sentence");
  if (pool.length === 0) return null;
  const c = pool[Math.floor(Math.random() * pool.length)];
  return { kind: "meme", id: uid(), word: c.word, reading: c.reading, meaning: c.meaning };
}

// "Which word did you hear?" — trains the ear without keyboard friction.
function buildListen(state: AppState, lang: Lang): FeedItem | null {
  const pool = state.cards.filter((c) => c.lang === lang && c.fsrs.reps >= 1);
  if (pool.length === 0) return null;
  const card = pool[Math.floor(Math.random() * pool.length)];
  const distractors = shuffle(
    SEED[lang].filter((e) => e.word !== card.word).map((e) => e.word)
  ).slice(0, 3);
  if (distractors.length < 3) return null;
  const options = shuffle([card.word, ...distractors]);
  return {
    kind: "listen",
    id: uid(),
    cardId: card.id,
    options,
    answer: options.indexOf(card.word),
  };
}

function buildQuiz(state: AppState, lang: Lang): FeedItem | null {
  const pool = state.cards.filter((c) => c.lang === lang && c.fsrs.reps >= 1);
  if (pool.length === 0) return null;
  const card = pool[Math.floor(Math.random() * pool.length)];
  const seed = SEED[lang];
  const distractors = shuffle(
    seed.filter((e) => e.meaning !== card.meaning).map((e) => e.meaning)
  ).slice(0, 3);
  if (distractors.length < 3) return null;
  const options = shuffle([card.meaning, ...distractors]);
  return {
    kind: "quiz",
    id: uid(),
    cardId: card.id,
    options,
    answer: options.indexOf(card.meaning),
  };
}

export interface FeedContext {
  /** kinds of the most recently queued items, most recent last */
  recentKinds: string[];
  /** card ids already queued but not yet answered */
  queuedCardIds: Set<string>;
  /** new-word items queued ahead of the persisted pointer */
  queuedNewCount: number;
  /** last answered interaction was a fail */
  lastWasFail: boolean;
  /** items since the last status card */
  sinceStatus: number;
}

export function nextFeedItem(state: AppState, ctx: FeedContext): FeedItem {
  const lang = state.lang;
  const due = dueCards(state, lang).filter((c) => !ctx.queuedCardIds.has(c.id));
  const nextNewIndex = state.newIndex[lang] + ctx.queuedNewCount;
  const hasNew = nextNewIndex < SEED[lang].length;
  const recent = ctx.recentKinds.slice(-2);
  const reviewRun = recent.filter((k) => k === "review").length;

  const newItem = (): FeedItem => ({ kind: "new", id: uid(), entryIndex: nextNewIndex });
  const reviewItem = (): FeedItem => ({ kind: "review", id: uid(), cardId: due[0].id });

  // status card roughly every 12 items
  if (ctx.sinceStatus >= 12 && Math.random() < 0.4) {
    return { kind: "status", id: uid() };
  }

  const canReview = due.length > 0 && reviewRun < 2 && !ctx.lastWasFail;
  const quiz = buildQuiz(state, lang);
  const canGrammar =
    GRAMMAR[lang].length > 0 && !ctx.lastWasFail && !recent.includes("grammar");
  const listen = !ctx.lastWasFail && !recent.includes("listen") ? buildListen(state, lang) : null;
  const speakTarget =
    !ctx.lastWasFail && !recent.includes("speak") ? pickSpeakTarget(state, lang) : null;
  const meme = !recent.includes("meme") ? buildMeme(state, lang) : null;

  // Weighted pick: reviews 32 / new 15 / quiz 14 / grammar 11 / listen 11 / speak 11 / meme 5 / status 4
  const roll = Math.random() * 100;
  if (canReview && roll < 32) return reviewItem();
  if (hasNew && roll < 47) return newItem();
  if (quiz && !ctx.lastWasFail && roll < 61) return quiz;
  if (canGrammar && roll < 72) return buildGrammar(lang);
  if (listen && roll < 83) return listen;
  if (speakTarget && roll < 94) return { kind: "speak", id: uid(), target: speakTarget };
  if (meme && roll < 98) return meme;

  // fallbacks, easiest wins first (also the post-fail path)
  if (hasNew) return newItem();
  if (quiz) return quiz;
  if (meme) return meme;
  if (due.length > 0 && reviewRun < 2) return reviewItem();
  return { kind: "status", id: uid() };
}
