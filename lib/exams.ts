// Exam targets: labels, per-level vocab totals, and language mapping.
// Totals are approximate published new-word counts per level — enough for
// honest coverage bars and pace forecasts.

import type { Exam, Lang } from "./types";

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
