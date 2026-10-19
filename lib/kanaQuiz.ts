// Kana recognition quiz — the pure half of the Learn zone's hiragana/katakana
// self-check. A character is shown, the learner picks or types its romaji.
// Rounds score on the FIRST try per character; a miss is re-asked a few cards
// later (not scored again) so the round ends on a correct read, and the end
// screen can drill everything that was missed. All local, no network.

import type { Kana } from "./types";

export type KanaScript = "hiragana" | "katakana" | "mixed";
/** "dakuten" covers handakuten (ぱ row) too; "yoon" = combinations (きゃ). */
export type KanaSet = "basic" | "dakuten" | "yoon";
export type AnswerMode = "pick" | "type";

/** The beginner checkpoint: 20 random characters, aim for 90%. */
export const CHECK_LENGTH = 20;
export const PASS_PCT = 90;
/** A miss comes back this many cards later. */
export const REPEAT_GAP = 3;
/** After this many misses a character stops coming back this round. */
export const MAX_MISSES = 3;

export function inSet(k: Kana, set: KanaSet): boolean {
  if (set === "dakuten") return k.type === "dakuten" || k.type === "handakuten";
  return k.type === set;
}

export function kanaPool(
  hiragana: Kana[],
  katakana: Kana[],
  script: KanaScript,
  sets: KanaSet[]
): Kana[] {
  const src =
    script === "hiragana" ? hiragana : script === "katakana" ? katakana : [...hiragana, ...katakana];
  return src.filter((k) => sets.some((s) => inSet(k, s)));
}

// ---------- typed answers ----------

// Hepburn is what the charts teach; Kunrei/Nihon-shiki and IME spellings are
// accepted too so a learner who types "si" isn't marked wrong for knowing it.
const ALT: Record<string, string[]> = {
  shi: ["si"],
  chi: ["ti"],
  tsu: ["tu"],
  fu: ["hu"],
  ji: ["zi"],
  wo: ["o"], // を is pronounced "o" today
  n: ["nn"],
  sha: ["sya"],
  shu: ["syu"],
  sho: ["syo"],
  cha: ["tya", "cya"],
  chu: ["tyu", "cyu"],
  cho: ["tyo", "cyo"],
  ja: ["zya", "jya"],
  ju: ["zyu", "jyu"],
  jo: ["zyo", "jyo"],
};
// ぢ/づ keep their d- spelling on IME keyboards
const CHAR_ALT: Record<string, string[]> = {
  ぢ: ["di"],
  ヂ: ["di"],
  づ: ["du"],
  ヅ: ["du"],
};

export function normalizeRomaji(s: string): string {
  return s.normalize("NFKC").toLowerCase().replace(/[^a-z]/g, "");
}

export function acceptedAnswers(k: Kana): string[] {
  return [k.romaji, ...(ALT[k.romaji] ?? []), ...(CHAR_ALT[k.char] ?? [])];
}

/** "exact" = the Hepburn the chart shows; "alt" = an accepted other spelling. */
export function gradeTyped(k: Kana, input: string): "exact" | "alt" | "wrong" {
  const said = normalizeRomaji(input);
  if (!said) return "wrong";
  if (said === k.romaji) return "exact";
  return acceptedAnswers(k).includes(said) ? "alt" : "wrong";
}

// ---------- multiple choice ----------

// Pairs beginners genuinely mix up — offered as distractors first so a pick
// question tests reading, not elimination.
const CONFUSABLE: string[][] = [
  ["あ", "お"],
  ["い", "り"],
  ["き", "さ"],
  ["さ", "ち"],
  ["ぬ", "め"],
  ["ね", "れ", "わ"],
  ["る", "ろ"],
  ["は", "ほ"],
  ["ほ", "ま"],
  ["け", "は"],
  ["し", "つ"],
  ["く", "へ"],
  ["シ", "ツ"],
  ["ソ", "ン"],
  ["シ", "ン"],
  ["ソ", "ツ"],
  ["ク", "ケ", "タ"],
  ["ウ", "ワ", "フ"],
  ["チ", "テ"],
  ["ア", "マ"],
  ["ヌ", "ス"],
  ["コ", "ユ"],
];
const CONFUSED_WITH = new Map<string, Set<string>>();
for (const group of CONFUSABLE) {
  for (const c of group) {
    const set = CONFUSED_WITH.get(c) ?? new Set<string>();
    for (const o of group) if (o !== c) set.add(o);
    CONFUSED_WITH.set(c, set);
  }
}

// が → か, ぴゃ → ひゃ: strip the dakuten/handakuten marks
function baseGlyph(char: string): string {
  return char.normalize("NFD").replace(/[゙゚]/g, "");
}

function vowel(romaji: string): string {
  return romaji === "n" ? "n" : romaji[romaji.length - 1];
}

function similarity(a: Kana, b: Kana): number {
  let s = 0;
  if (CONFUSED_WITH.get(a.char)?.has(b.char)) s += 3;
  if (baseGlyph(a.char) === baseGlyph(b.char)) s += 3; // か vs が
  if (a.row === b.row && a.type === b.type) s += 2; // き vs く
  if (vowel(a.romaji) === vowel(b.romaji)) s += 1;
  if (a.type === b.type) s += 1; // a combo question gets combo options
  return s;
}

/**
 * Four romaji options (fewer only if the pool can't supply them), all
 * distinct, exactly one of which is `target.romaji`. Distractors lean towards
 * look-alikes and same-row sounds, with jitter so rounds don't repeat.
 */
export function pickOptions(target: Kana, pool: Kana[], rand = Math.random, count = 4): string[] {
  const best = new Map<string, number>();
  for (const k of pool) {
    if (k.romaji === target.romaji) continue; // じ/ぢ are both "ji"
    const score = similarity(target, k) + rand() * 2.5;
    if (score > (best.get(k.romaji) ?? -1)) best.set(k.romaji, score);
  }
  const distractors = [...best.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, count - 1)
    .map(([r]) => r);
  return shuffle([target.romaji, ...distractors], rand);
}

// ---------- rounds ----------

export function shuffle<T>(xs: T[], rand = Math.random): T[] {
  const a = [...xs];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** `n` distinct characters at random (the whole pool, shuffled, if n ≥ size). */
export function sampleKana(pool: Kana[], n: number, rand = Math.random): Kana[] {
  return shuffle(pool, rand).slice(0, Math.max(0, n));
}

export interface QuizItem {
  kana: Kana;
  repeat: boolean; // a re-ask after a miss — never scored
}

export interface Round {
  kind: "check" | "drill"; // drill = practising a previous round's misses
  queue: QuizItem[]; // queue[0] is the current card
  total: number; // distinct characters — the score denominator
  correct: number; // right on the first try
  missed: Kana[]; // distinct, in the order they were first missed
  misses: Record<string, number>; // char → times missed this round
}

export function newRound(items: Kana[], kind: Round["kind"] = "check"): Round {
  return {
    kind,
    queue: items.map((kana) => ({ kana, repeat: false })),
    total: items.length,
    correct: 0,
    missed: [],
    misses: {},
  };
}

export function answerRound(r: Round, ok: boolean): Round {
  const [cur, ...rest] = r.queue;
  if (!cur) return r;
  const char = cur.kana.char;
  const correct = r.correct + (ok && !cur.repeat ? 1 : 0);
  if (ok) return { ...r, queue: rest, correct };

  const n = (r.misses[char] ?? 0) + 1;
  const missed = r.missed.some((k) => k.char === char) ? r.missed : [...r.missed, cur.kana];
  const queue =
    n < MAX_MISSES
      ? [...rest.slice(0, REPEAT_GAP), { kana: cur.kana, repeat: true }, ...rest.slice(REPEAT_GAP)]
      : rest;
  return { ...r, queue, correct, missed, misses: { ...r.misses, [char]: n } };
}

export function roundDone(r: Round): boolean {
  return r.queue.length === 0;
}

/** Distinct characters already shown (for "7 / 20"). */
export function seenCount(r: Round): number {
  const pending = new Set(r.queue.filter((q) => !q.repeat).map((q) => q.kana.char));
  return r.total - pending.size;
}

export function scorePct(r: Pick<Round, "correct" | "total">): number {
  return r.total ? Math.round((r.correct / r.total) * 100) : 0;
}

export function passed(r: Pick<Round, "correct" | "total">): boolean {
  return r.total > 0 && (r.correct / r.total) * 100 >= PASS_PCT;
}

/** Key for remembering a best score per configuration. */
export function configKey(script: KanaScript, sets: KanaSet[], length: number): string {
  const order: KanaSet[] = ["basic", "dakuten", "yoon"];
  return `${script}:${order.filter((s) => sets.includes(s)).join("+")}:${length}`;
}
