import jlptN5 from "@/data/jlpt_n5.json";
import goetheA1 from "@/data/goethe_a1.json";
import type { Lang, VocabEntry } from "./types";

export const SEED: Record<Lang, VocabEntry[]> = {
  ja: jlptN5 as VocabEntry[],
  de: goetheA1 as VocabEntry[],
};

export const SEED_LABEL: Record<Lang, string> = {
  ja: "JLPT N5",
  de: "GOETHE A1",
};
