"use client";

// Local-first app store: everything lives in localStorage, no network needed.

import { useSyncExternalStore } from "react";
import type {
  AppState,
  Card,
  Lang,
  PetMood,
  Quest,
  QuestKey,
  Rating,
  VocabEntry,
} from "./types";
import type { DayStats, Exam, Target } from "./types";
import { newFsrsState, schedule, MASTERY_STABILITY_DAYS } from "./fsrs";
import { SEED } from "./seed";
import { COSMETICS, type Cosmetic, dailyQuests } from "./quests";

const KEY = "langlang.v1";

export function todayStr(d = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function defaultState(): AppState {
  return {
    version: 1,
    lang: "ja",
    furigana: true,
    sound: true,
    cards: [],
    newIndex: { ja: 0, de: 0 },
    xp: 0,
    streak: { current: 0, longest: 0, freezes: 0, lastActive: "" },
    today: { date: todayStr(), reviews: 0, correct: 0, newWords: 0, xp: 0 },
    bestCombo: 0,
    quests: dailyQuests(todayStr()),
    questDate: todayStr(),
    packs: 0,
    pet: { name: "Mochi", cosmetics: [], equipped: [] },
    menace: false,
    targets: {},
    log: {},
    bossesCleared: [],
  };
}

let state: AppState = defaultState();
let hydrated = false;
const listeners = new Set<() => void>();

function load() {
  if (hydrated || typeof window === "undefined") return;
  hydrated = true;
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) state = { ...defaultState(), ...JSON.parse(raw) };
  } catch {
    // corrupted storage — start fresh
  }
  rolloverDay();
}

let saveTimer: ReturnType<typeof setTimeout> | null = null;
function save() {
  if (typeof window === "undefined") return;
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch {
      // storage full — nothing sensible to do
    }
  }, 150);
}

function emit() {
  save();
  for (const l of listeners) l();
}

export function getState(): AppState {
  return state;
}

function setState(patch: Partial<AppState>) {
  state = { ...state, ...patch };
  emit();
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

const serverSnapshot = defaultState();

export function useApp(): AppState {
  return useSyncExternalStore(
    subscribe,
    () => {
      load();
      return state;
    },
    () => serverSnapshot
  );
}

// ---- day / streak ----

const LOG_CAP = 120; // keep ~4 months of daily history

function rolloverDay() {
  const today = todayStr();
  if (state.today.date !== today) {
    // snapshot the finished day into the history log (skip empty days)
    let log = state.log;
    const d = state.today;
    if (d.reviews || d.newWords || d.xp || d.speaks) {
      log = { ...log, [d.date]: d };
      const keys = Object.keys(log).sort();
      while (keys.length > LOG_CAP) delete log[keys.shift()!];
    }
    state = {
      ...state,
      log,
      today: { date: today, reviews: 0, correct: 0, newWords: 0, xp: 0, speaks: 0 },
    };
  }
  if (state.questDate !== today) {
    // fresh quests each day; unopened packs carry over
    state = { ...state, quests: dailyQuests(today), questDate: today };
  }
}

function touchStreak() {
  const today = todayStr();
  const s = state.streak;
  if (s.lastActive === today) return;

  const yesterday = todayStr(new Date(Date.now() - 86400000));
  const dayBefore = todayStr(new Date(Date.now() - 2 * 86400000));

  let current: number;
  let freezes = s.freezes;
  if (s.lastActive === yesterday) {
    current = s.current + 1;
  } else if (s.lastActive === dayBefore && freezes > 0) {
    // one missed day covered by a freeze
    freezes -= 1;
    current = s.current + 1;
  } else {
    current = 1;
  }
  setState({
    streak: {
      current,
      longest: Math.max(current, s.longest),
      freezes,
      lastActive: today,
    },
  });
}

// ---- quests ----

// Mutates `state` in place (no emit) so callers can batch with their own emit.
// Completing a quest mints one card pack.
function applyQuest(key: QuestKey, amount: number, mode: "add" | "max" = "add") {
  let touched = false;
  let earnedPacks = 0;
  const quests = state.quests.map((q): Quest => {
    if (q.key !== key || q.done) return q;
    const raw = mode === "max" ? Math.max(q.progress, amount) : q.progress + amount;
    const progress = Math.min(raw, q.target);
    const done = progress >= q.target;
    if (done) earnedPacks += 1;
    touched = true;
    return { ...q, progress, done };
  });
  if (!touched) return;
  state = { ...state, quests, packs: state.packs + earnedPacks };
}

/** External quest bump (Dojo exchanges, combo peaks) — applies and emits. */
export function bumpQuest(key: QuestKey, amount: number, mode: "add" | "max" = "add") {
  rolloverDay();
  applyQuest(key, amount, mode);
  emit();
}

// ---- actions ----

export function setLang(lang: Lang) {
  setState({ lang });
}

export function toggleFurigana() {
  setState({ furigana: !state.furigana });
}

export function toggleSound() {
  setState({ sound: !state.sound });
}

export function cardIdFor(lang: Lang, word: string) {
  return `${lang}:${word}`;
}

export function entryToCard(lang: Lang, entry: VocabEntry): Card {
  return {
    id: cardIdFor(lang, entry.word),
    lang,
    type: lang === "de" && entry.article ? "noun_de" : "vocab",
    word: entry.word,
    reading: entry.reading,
    article: entry.article,
    plural: entry.plural,
    meaning: entry.meaning,
    example: entry.example,
    exampleReading: entry.exampleReading,
    exampleMeaning: entry.exampleMeaning,
    pos: entry.pos,
    isGolden: Math.random() < 0.06, // rare golden pull
    createdAt: Date.now(),
    fsrs: newFsrsState(),
  };
}

/** Add the seed entry at `index` to the deck. Returns the new card (or existing one). */
export function addNewWord(lang: Lang, index: number): Card {
  rolloverDay();
  const entry = SEED[lang][index];
  const id = cardIdFor(lang, entry.word);
  const existing = state.cards.find((c) => c.id === id);
  if (existing) {
    bumpNewIndex(lang, index);
    emit();
    return existing;
  }
  const card = entryToCard(lang, entry);
  state = {
    ...state,
    cards: [...state.cards, card],
    today: {
      ...state.today,
      newWords: state.today.newWords + 1,
    },
  };
  bumpNewIndex(lang, index);
  applyQuest("newwords", 1);
  touchStreak();
  emit();
  return card;
}

export function skipNewWord(lang: Lang, index: number) {
  bumpNewIndex(lang, index);
  emit();
}

function bumpNewIndex(lang: Lang, index: number) {
  if (state.newIndex[lang] <= index) {
    state = {
      ...state,
      newIndex: { ...state.newIndex, [lang]: index + 1 },
    };
  }
}

/** Rate an SRS card. Returns XP earned. */
export function rateCard(cardId: string, rating: Rating, multiplier: number): number {
  rolloverDay();
  const card = state.cards.find((c) => c.id === cardId);
  if (!card) return 0;
  const next = schedule(card.fsrs, rating);
  const correct = rating >= 3;
  const base = correct ? (rating === 4 ? 15 : 10) : 2;
  const golden = card.isGolden ? 2 : 1;
  const xp = base * multiplier * golden;

  state = {
    ...state,
    cards: state.cards.map((c) => (c.id === cardId ? { ...c, fsrs: next } : c)),
    xp: state.xp + xp,
    today: {
      ...state.today,
      reviews: state.today.reviews + 1,
      correct: state.today.correct + (correct ? 1 : 0),
      xp: state.today.xp + xp,
    },
  };
  applyQuest("reviews", 1);
  touchStreak();
  emit();
  return xp;
}

/** Record a shadowing attempt and award XP. */
export function recordSpeak(correct: boolean, xp: number) {
  rolloverDay();
  state = {
    ...state,
    xp: state.xp + xp,
    today: {
      ...state.today,
      speaks: (state.today.speaks ?? 0) + 1,
      correct: state.today.correct + (correct ? 1 : 0),
      xp: state.today.xp + xp,
    },
  };
  if (correct) applyQuest("shadow", 1);
  touchStreak();
  emit();
}

/** "Your mistakes become your deck": add a Dojo mistake as a sentence card. */
export function addMistakeCard(
  lang: Lang,
  mistake: {
    youSaid: string;
    nativeSays: string;
    meaning: string;
    why: string;
    reading?: string;
  }
): Card | null {
  rolloverDay();
  const id = cardIdFor(lang, mistake.nativeSays);
  if (state.cards.some((c) => c.id === id)) return null;
  const card: Card = {
    id,
    lang,
    type: "sentence",
    word: mistake.nativeSays,
    reading: mistake.reading,
    meaning: mistake.meaning,
    example: undefined,
    exampleMeaning: undefined,
    pos: mistake.why, // shown as the "why" note on the card back
    isGolden: false,
    createdAt: Date.now(),
    fsrs: newFsrsState(),
  };
  state = { ...state, cards: [...state.cards, card] };
  touchStreak();
  emit();
  return card;
}

/** Pick a shadowing target: prefer deck sentences, fall back to seen seed examples. */
export function pickSpeakTarget(s: AppState, lang: Lang): { sentence: string; reading?: string; meaning?: string } | null {
  const withExamples = s.cards.filter(
    (c) => c.lang === lang && (c.example || c.type === "sentence")
  );
  if (withExamples.length > 0) {
    const c = withExamples[Math.floor(Math.random() * withExamples.length)];
    if (c.type === "sentence") {
      return { sentence: c.word, reading: c.reading, meaning: c.meaning };
    }
    return {
      sentence: c.example!,
      reading: c.exampleReading,
      meaning: c.exampleMeaning,
    };
  }
  const seen = SEED[lang].slice(0, s.newIndex[lang]).filter((e) => e.example);
  if (seen.length === 0) return null;
  const e = seen[Math.floor(Math.random() * seen.length)];
  return { sentence: e.example!, reading: e.exampleReading, meaning: e.exampleMeaning };
}

/** Award XP for non-review wins (quizzes, bonuses). */
export function awardXp(amount: number): number {
  rolloverDay();
  state = {
    ...state,
    xp: state.xp + amount,
    today: { ...state.today, xp: state.today.xp + amount },
  };
  touchStreak();
  emit();
  return amount;
}

export function recordBestCombo(combo: number) {
  rolloverDay();
  applyQuest("combo", combo, "max");
  if (combo > state.bestCombo) state = { ...state, bestCombo: combo };
  emit();
}

// ---- card packs ----

export interface PackReward {
  cards: Card[];
  cosmetic: Cosmetic | null;
  golden: number;
}

/** Open one pack: 3-4 bonus vocab cards (elevated golden rate) + a chance at a cosmetic. */
export function openPack(): PackReward | null {
  rolloverDay();
  if (state.packs <= 0) return null;
  const lang = state.lang;

  const owned = new Set(state.cards.map((c) => c.id));
  const pool = SEED[lang]
    .map((entry, index) => ({ entry, index }))
    .filter(({ entry }) => !owned.has(cardIdFor(lang, entry.word)));
  shuffle(pool);

  const cards: Card[] = [];
  let golden = 0;
  const pulls = Math.min(pool.length, 3 + (Math.random() < 0.5 ? 1 : 0));
  for (let i = 0; i < pulls; i++) {
    const card = entryToCard(lang, pool[i].entry);
    card.isGolden = Math.random() < 0.28; // packs are golden-rich
    if (card.isGolden) golden++;
    cards.push(card);
    // learning a packed word advances the "new word" pointer past it
    bumpNewIndex(lang, pool[i].index);
  }

  const unowned = COSMETICS.filter((c) => !state.pet.cosmetics.includes(c.id));
  const cosmetic =
    unowned.length > 0 && Math.random() < 0.4
      ? unowned[Math.floor(Math.random() * unowned.length)]
      : null;

  state = {
    ...state,
    packs: state.packs - 1,
    cards: [...state.cards, ...cards],
    today: { ...state.today, newWords: state.today.newWords + cards.length },
    pet: cosmetic
      ? { ...state.pet, cosmetics: [...state.pet.cosmetics, cosmetic.id] }
      : state.pet,
  };
  touchStreak();
  emit();
  return { cards, cosmetic, golden };
}

// ---- pet ----

export function toggleCosmetic(id: string) {
  if (!state.pet.cosmetics.includes(id)) return;
  const equipped = state.pet.equipped.includes(id)
    ? state.pet.equipped.filter((x) => x !== id)
    : [...state.pet.equipped, id];
  setState({ pet: { ...state.pet, equipped } });
}

export function renamePet(name: string) {
  const clean = name.trim().slice(0, 16) || "Mochi";
  setState({ pet: { ...state.pet, name: clean } });
}

export function setMenace(on: boolean) {
  setState({ menace: on });
}

export function petMood(s: AppState): PetMood {
  const today = todayStr();
  if (s.streak.lastActive === today) return "happy";
  if (!s.streak.lastActive) return "neutral";
  const yesterday = todayStr(new Date(Date.now() - 86400000));
  if (s.streak.lastActive === yesterday) return "neutral";
  return "sad"; // skipped a day — guilt, never grief
}

function shuffle<T>(arr: T[]) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

// ---- phase 4: targets, mastery, history, bosses ----

export function setTarget(lang: Lang, exam: Exam, date: string) {
  setState({ targets: { ...state.targets, [lang]: { exam, date } as Target } });
}

export function clearTarget(lang: Lang) {
  const targets = { ...state.targets };
  delete targets[lang];
  setState({ targets });
}

/** Add a mined sentence + its unknown words to the deck. Returns cards added. */
export function addMinedCards(
  lang: Lang,
  sentence: { text: string; reading?: string; meaning: string },
  words: { word: string; reading?: string; meaning: string; pos?: string }[]
): number {
  rolloverDay();
  const additions: Card[] = [];
  const sid = cardIdFor(lang, sentence.text);
  if (!state.cards.some((c) => c.id === sid)) {
    additions.push({
      id: sid,
      lang,
      type: "sentence",
      word: sentence.text,
      reading: sentence.reading,
      meaning: sentence.meaning,
      isGolden: false,
      createdAt: Date.now(),
      fsrs: newFsrsState(),
    });
  }
  for (const w of words) {
    const id = cardIdFor(lang, w.word);
    if (state.cards.some((c) => c.id === id) || additions.some((c) => c.id === id))
      continue;
    additions.push({
      id,
      lang,
      type: "vocab",
      word: w.word,
      reading: w.reading,
      meaning: w.meaning,
      pos: w.pos,
      isGolden: false,
      createdAt: Date.now(),
      fsrs: newFsrsState(),
    });
  }
  if (additions.length === 0) return 0;
  state = {
    ...state,
    cards: [...state.cards, ...additions],
    today: { ...state.today, newWords: state.today.newWords + additions.length },
  };
  applyQuest("newwords", additions.length);
  touchStreak();
  emit();
  return additions.length;
}

/** Clear a conversation boss: award XP + a pack, unlock the next. */
export function clearBoss(id: string): boolean {
  rolloverDay();
  if (state.bossesCleared.includes(id)) return false;
  state = {
    ...state,
    bossesCleared: [...state.bossesCleared, id],
    xp: state.xp + 100,
    packs: state.packs + 1,
    streak: { ...state.streak, freezes: state.streak.freezes + 1 }, // boss win earns a freeze
    today: { ...state.today, xp: state.today.xp + 100 },
  };
  touchStreak();
  emit();
  return true;
}

/** Cards whose FSRS stability clears the mastery threshold. */
export function masteredCount(s: AppState, lang: Lang): number {
  return s.cards.filter(
    (c) => c.lang === lang && c.fsrs.stability >= MASTERY_STABILITY_DAYS
  ).length;
}

export function activeVocab(s: AppState, lang: Lang): number {
  return s.cards.filter((c) => c.lang === lang && c.type !== "sentence").length;
}

/** Ordered [date, stats] for the last `days` days (missing days omitted). */
export function logRange(s: AppState, days: number): { date: string; stats: DayStats }[] {
  const out: { date: string; stats: DayStats }[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const date = todayStr(new Date(Date.now() - i * 86400000));
    const stats = date === s.today.date ? s.today : s.log[date];
    if (stats) out.push({ date, stats });
  }
  return out;
}

export function weeklyStats(s: AppState) {
  const days = logRange(s, 7);
  const sum = days.reduce(
    (a, { stats }) => ({
      reviews: a.reviews + stats.reviews,
      correct: a.correct + stats.correct,
      newWords: a.newWords + stats.newWords,
      xp: a.xp + stats.xp,
      speaks: a.speaks + (stats.speaks ?? 0),
    }),
    { reviews: 0, correct: 0, newWords: 0, xp: 0, speaks: 0 }
  );
  // rough practice minutes: reviews ~4s, speaks ~7s, new words ~3s
  const minutes = Math.round((sum.reviews * 4 + sum.speaks * 7 + sum.newWords * 3) / 60);
  const activeDays = days.filter(
    ({ stats }) => stats.reviews || stats.newWords || stats.speaks
  ).length;
  return { ...sum, minutes, activeDays };
}

/** The card that fought back hardest: most lapses, then lowest stability. */
export function hardestWord(s: AppState, lang: Lang): Card | null {
  const pool = s.cards.filter((c) => c.lang === lang && c.fsrs.reps > 0);
  if (pool.length === 0) return null;
  return [...pool].sort(
    (a, b) => b.fsrs.lapses - a.fsrs.lapses || a.fsrs.stability - b.fsrs.stability
  )[0];
}

/** Projected date to reach a target's vocab count at the recent learning pace. */
export function paceForecast(
  s: AppState,
  lang: Lang,
  total: number
): { rate: number; daysLeft: number; date: string | null } {
  const mastered = masteredCount(s, lang);
  const remaining = Math.max(0, total - mastered);
  const window = logRange(s, 14);
  const learned = window.reduce((a, { stats }) => a + stats.newWords, 0);
  const activeDays = Math.max(1, window.length);
  const rate = learned / activeDays; // words/day proxy
  if (remaining === 0) return { rate, daysLeft: 0, date: todayStr() };
  if (rate < 0.05) return { rate, daysLeft: Infinity, date: null };
  const daysLeft = Math.ceil(remaining / rate);
  const date = todayStr(new Date(Date.now() + daysLeft * 86400000));
  return { rate, daysLeft, date };
}

// ---- derived ----

export function dueCards(s: AppState, lang: Lang, now = Date.now()): Card[] {
  // includes phase "new" cards: a just-added word is immediately reviewable
  return s.cards
    .filter((c) => c.lang === lang && c.fsrs.due <= now)
    .sort((a, b) => a.fsrs.due - b.fsrs.due);
}

export function levelFromXp(xp: number): { level: number; into: number; span: number } {
  // Level n requires 100 * n^1.5 XP total-ish; simple quadratic curve
  let level = 1;
  let threshold = 0;
  let span = 100;
  while (xp >= threshold + span) {
    threshold += span;
    level += 1;
    span = Math.round(100 * Math.pow(level, 1.3));
  }
  return { level, into: xp - threshold, span };
}
