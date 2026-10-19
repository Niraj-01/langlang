// Japanese grammar reference helpers: the N5 pattern list, drill labels, and
// the ruby notation the reference data is written in.

import points from "@/data/grammar_points_ja.json";
import type { GrammarItem, GrammarPoint } from "./types";

export const GRAMMAR_POINTS_JA = points as GrammarPoint[];

const TAGS = new Map(GRAMMAR_POINTS_JA.map((p) => [p.id, p.tag]));

/** Kicker for a drill card: its pattern's tag, else the legacy default. */
export function grammarTag(item: GrammarItem): string {
  if (item.pattern) return TAGS.get(item.pattern) ?? item.pattern;
  return item.lang === "ja" ? "particle" : "article";
}

/** The kana line of a ja drill with the blank filled by option `i` (or ▢). */
export function fillReading(item: GrammarItem, i: number | null): string {
  const reading = item.promptReading ?? "";
  if (i === null) return reading.replace("＿", "▢");
  return reading.replace("＿", item.optionReadings?.[i] ?? item.options[i]);
}

// ---- ruby notation: 漢字[かんじ] ----

export interface RubySeg {
  base: string;
  ruby?: string;
}

// kanji run (CJK unified + ext A + compat + 々) immediately followed by [reading]
const RUBY = /([㐀-䶿一-鿿豈-﫿々]+)\[([^\]]+)\]/g;

export function parseRuby(src: string): RubySeg[] {
  const out: RubySeg[] = [];
  let last = 0;
  for (const m of src.matchAll(RUBY)) {
    if (m.index! > last) out.push({ base: src.slice(last, m.index) });
    out.push({ base: m[1], ruby: m[2] });
    last = m.index! + m[0].length;
  }
  if (last < src.length) out.push({ base: src.slice(last) });
  return out;
}

/** Plain text as it would be printed (readings dropped) — for TTS. */
export function stripRuby(src: string): string {
  return src.replace(RUBY, "$1");
}

/** All-kana version (kanji swapped for their readings). */
export function rubyToKana(src: string): string {
  return src.replace(RUBY, "$2");
}
