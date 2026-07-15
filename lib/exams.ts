// Exam targets: labels, per-level vocab totals, and language mapping.
// Totals are approximate published new-word counts per level — enough for
// honest coverage bars and pace forecasts.
//
// For the four AUDITED exams (N5/N4/A1/A2) we go further: the official (JLPT:
// community-standard) wordlist ships as data/exam_words_{exam}.json — built by
// `npm run audit` from scripts/wordlists/ — mapping every official list word
// to its seedIndex, or null where our seeds don't cover it yet. Coverage bars
// for those exams are computed against the REAL list, not the estimate.
// Bundled via import, so /progress stays fully offline.

import type { Exam, Lang } from "./types";
import wordsJlptN5 from "@/data/exam_words_jlpt_n5.json";
import wordsJlptN4 from "@/data/exam_words_jlpt_n4.json";
import wordsGoetheA1 from "@/data/exam_words_goethe_a1.json";
import wordsGoetheA2 from "@/data/exam_words_goethe_a2.json";

export const EXAMS_BY_LANG: Record<Lang, Exam[]> = {
  ja: ["jlpt_n5", "jlpt_n4", "jlpt_n3", "jlpt_n2", "jlpt_n1"],
  de: ["goethe_a1", "goethe_a2", "goethe_b1", "goethe_b2", "goethe_c1", "goethe_c2"],
};

export const EXAM_LABEL: Record<Exam, string> = {
  jlpt_n5: "JLPT N5",
  jlpt_n4: "JLPT N4",
  jlpt_n3: "JLPT N3",
  jlpt_n2: "JLPT N2",
  jlpt_n1: "JLPT N1",
  goethe_a1: "Goethe A1",
  goethe_a2: "Goethe A2",
  goethe_b1: "Goethe B1",
  goethe_b2: "Goethe B2",
  goethe_c1: "Goethe C1",
  goethe_c2: "Goethe C2",
};

// approximate new vocabulary introduced at each level
export const EXAM_VOCAB_TOTAL: Record<Exam, number> = {
  jlpt_n5: 800,
  jlpt_n4: 700,
  jlpt_n3: 1800,
  jlpt_n2: 1800,
  jlpt_n1: 3500,
  goethe_a1: 650,
  goethe_a2: 650,
  goethe_b1: 1100,
  goethe_b2: 2600,
  goethe_c1: 5000,
  goethe_c2: 6000,
};

export function examLang(exam: Exam): Lang {
  return exam.startsWith("jlpt") ? "ja" : "de";
}

// ---- audited official wordlists ----

export type ExamWordMap = Record<string, number | null>; // list word → seedIndex | null

export const EXAM_WORDS: Partial<Record<Exam, ExamWordMap>> = {
  jlpt_n5: wordsJlptN5 as ExamWordMap,
  jlpt_n4: wordsJlptN4 as ExamWordMap,
  goethe_a1: wordsGoetheA1 as ExamWordMap,
  goethe_a2: wordsGoetheA2 as ExamWordMap,
};

export interface ExamCoverage {
  mastered: number; // official words mastered by the learner
  inSeeds: number; // official words our seed content covers at all
  total: number; // official list size
}

/** Coverage against the official list, or null for exams without audit data. */
export function examCoverage(
  exam: Exam,
  isMastered: (seedIndex: number) => boolean
): ExamCoverage | null {
  const words = EXAM_WORDS[exam];
  if (!words) return null;
  let mastered = 0;
  let inSeeds = 0;
  let total = 0;
  for (const idx of Object.values(words)) {
    total++;
    if (idx === null) continue;
    inSeeds++;
    if (isMastered(idx)) mastered++;
  }
  return { mastered, inSeeds, total };
}
