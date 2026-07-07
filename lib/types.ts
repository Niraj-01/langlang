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
}

// ---- Feed ----

export type FeedItem =
  | { kind: "review"; id: string; cardId: string }
  | { kind: "new"; id: string; entryIndex: number }
  | { kind: "quiz"; id: string; cardId: string; options: string[]; answer: number }
  | { kind: "speak"; id: string; target: SpeakTarget }
  | { kind: "meme"; id: string; word: string; reading?: string; meaning: string }
  | { kind: "status"; id: string };

export interface SpeakTarget {
  sentence: string;
  reading?: string; // kana (ja)
  meaning?: string;
}
