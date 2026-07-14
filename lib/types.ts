export type Lang = "ja" | "de";

export type Rating = 1 | 2 | 3 | 4; // Again, Hard, Good, Easy

export type CardPhase = "new" | "learning" | "review" | "relearning";

export interface FsrsState {
  phase: CardPhase;
  stability: number;
  difficulty: number;
  due: number; // epoch ms
  lastReview: number | null;
  reps: number;
  lapses: number;
}

export type CardType = "vocab" | "noun_de" | "kanji" | "grammar" | "sentence";

export interface Card {
  id: string;
  lang: Lang;
  type: CardType;
  word: string;
  reading?: string; // kana (ja)
  article?: "der" | "die" | "das"; // German nouns
  plural?: string; // German nouns
  meaning: string;
  example?: string;
  exampleReading?: string; // kana version (ja)
  exampleMeaning?: string;
  pos?: string;
  tip?: string; // usage / grammar note (max 2 sentences)
  mnemonic?: string; // memory hook (max 2 sentences)
  pitch?: number; // ja Tokyo pitch-accent: mora after which pitch drops (0 = heiban)
  isGolden: boolean;
  createdAt: number;
  fsrs: FsrsState;
}

export interface VocabEntry {
  word: string;
  reading?: string;
  article?: "der" | "die" | "das";
  plural?: string;
  meaning: string;
  example?: string;
  exampleReading?: string;
  exampleMeaning?: string;
  pos?: string;
  tip?: string;
  mnemonic?: string;
  pitch?: number; // ja Tokyo pitch-accent drop position (0 = heiban)
}

export interface StreakState {
  current: number;
  longest: number;
  freezes: number;
  lastActive: string; // yyyy-mm-dd
}

export type QuestKey = "reviews" | "shadow" | "newwords" | "combo" | "exchanges";

export interface Quest {
  key: QuestKey;
  label: string;
  target: number;
  progress: number;
  done: boolean;
}

export interface PetState {
  name: string;
  cosmetics: string[]; // owned cosmetic ids
  equipped: string[]; // currently worn
}

export type PetMood = "happy" | "neutral" | "sad";

export type Exam =
  | "jlpt_n5"
  | "jlpt_n4"
  | "jlpt_n3"
  | "jlpt_n2"
  | "jlpt_n1"
  | "goethe_a1"
  | "goethe_a2"
  | "goethe_b1"
  | "goethe_b2"
  | "goethe_c1"
  | "goethe_c2";

export interface Target {
  exam: Exam;
  date: string; // yyyy-mm-dd target exam date
}

export interface DayStats {
  date: string; // yyyy-mm-dd
  reviews: number;
  correct: number;
  newWords: number;
  xp: number;
  speaks?: number; // shadowing attempts (added in phase 2)
}

// First-run onboarding answers (design: Onboarding & Lesson flow).
export interface OnboardingState {
  done: boolean;
  why?: string; // "travel" | "fun" | "work" | "curious"
  level?: string; // "new" | "kana" | "words" | "conversations"
  minutes?: number; // daily goal in minutes (5/10/15/20)
  start?: "scratch" | "placement";
}

// A wrong answer worth revisiting — filled from lessons and failed reviews.
export interface MistakeEntry {
  lang: Lang;
  word: string;
  meaning: string;
  reading?: string;
  tip?: string; // coaching note captured at miss time, so rehab can teach
  mnemonic?: string;
  ts: number;
}

export interface AppState {
  version: number;
  lang: Lang;
  furigana: boolean;
  sound: boolean;
  cards: Card[];
  newIndex: { ja: number; de: number }; // pointer into seed lists
  xp: number;
  streak: StreakState;
  today: DayStats;
  bestCombo: number;
  // phase 3 — addiction layer
  quests: Quest[];
  questDate: string; // yyyy-mm-dd the quests were rolled for
  packs: number; // unopened card packs
  pet: PetState;
  menace: boolean; // menace-mode notifications opt-in
  // phase 4 — depth
  targets: Partial<Record<Lang, Target>>;
  log: Record<string, DayStats>; // past-day snapshots, keyed by date
  bossesCleared: string[]; // boss scenario ids defeated
  // phase 7 — lessons, goals & collections
  favorites: string[]; // e.g. "kanji:食", "phrase:こんにちは", "ja:水"
  mistakeLog: MistakeEntry[]; // most recent first, capped
  dailyGoal: number; // XP target per day
  onboarding: OnboardingState;
  // League identity. Both are read by the OPTIONAL supabase `leaderboard` view;
  // shareLeaderboard defaults to false, so a user is never listed without
  // explicitly opting in (see supabase/migrations/0002_leaderboard.sql).
  displayName?: string;
  shareLeaderboard?: boolean;
}

// ---- Feed ----

export type FeedItem =
  | { kind: "review"; id: string; cardId: string }
  | { kind: "new"; id: string; entryIndex: number }
  | { kind: "quiz"; id: string; cardId: string; options: string[]; answer: number }
  | { kind: "grammar"; id: string; item: GrammarItem }
  | { kind: "listen"; id: string; cardId: string; options: string[]; answer: number }
  | { kind: "speak"; id: string; target: SpeakTarget }
  | { kind: "meme"; id: string; word: string; reading?: string; meaning: string }
  | { kind: "status"; id: string };

// A fill-in-the-blank grammar drill (particle for ja, article/case for de).
// `prompt` marks the blank with the full-width underscore ＿.
export interface GrammarItem {
  lang: Lang;
  prompt: string;
  promptReading?: string; // kana version (ja)
  options: string[];
  answer: number;
  note: string; // why — max 2 sentences
  translation: string;
}

export interface SpeakTarget {
  sentence: string;
  reading?: string; // kana (ja)
  meaning?: string;
}

// ---- Japanese reference (Learn zone): kana / kanji / phrases ----

export interface Example {
  word: string;
  romaji: string;
  meaning: string;
}

export interface Kana {
  char: string;
  romaji: string;
  type: "basic" | "dakuten" | "handakuten" | "yoon";
  row: string;
  example?: Example;
}

export interface Kanji {
  kanji: string;
  meaning: string;
  onyomi: string[];
  kunyomi: string[];
  strokes: number;
  category: string;
  examples: Example[];
  components?: string; // visual parts, e.g. "亻 person + 木 tree"
  mnemonic?: string; // WaniKani-style story (max 2 sentences)
}

export interface Radical {
  radical: string;
  meaning: string;
  mnemonic: string;
  forms: string[]; // alternate written forms, e.g. 亻 for 人
  kanji: string[]; // kanji in our set built from this radical
}

export interface Phrase {
  japanese: string;
  romaji: string;
  english: string;
  category: string;
  pronunciation: string;
}
