// Local shadowing score: normalized Levenshtein similarity.
// Works offline — Claude only adds the one-line coaching on top.

import type { Lang } from "./types";

function normalize(text: string, lang: Lang): string {
  let t = text.trim();
  if (lang === "ja") {
    // strip all punctuation and spaces; kanji/kana compare char-by-char
    t = t.replace(/[、。！？「」『』・\s.,!?…〜~ー–—'"']/g, "");
    // fold katakana to hiragana so STT variants still match
    t = t.replace(/[ァ-ヶ]/g, (ch) =>
      String.fromCharCode(ch.charCodeAt(0) - 0x60)
    );
  } else {
    t = t
      .toLowerCase()
      .replace(/[.,!?;:…'"„“”\-–—]/g, "")
      .replace(/\s+/g, " ")
      .trim();
  }
  return t;
}

function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    for (let j = 1; j <= b.length; j++) {
      cur[j] = Math.min(
        prev[j] + 1,
        cur[j - 1] + 1,
        prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)
      );
    }
    prev = cur;
  }
  return prev[b.length];
}

/**
 * 0–100 similarity between what was said and the target.
 * For Japanese, pass the kana reading as `altTarget` — STT may return
 * kanji or kana, so we score against both and keep the best.
 */
export function shadowScore(
  transcript: string,
  target: string,
  lang: Lang,
  altTarget?: string
): number {
  const said = normalize(transcript, lang);
  if (!said) return 0;
  const candidates = [target, ...(altTarget ? [altTarget] : [])].map((t) =>
    normalize(t, lang)
  );
  let best = 0;
  for (const t of candidates) {
    if (!t) continue;
    const dist = levenshtein(said, t);
    const sim = 1 - dist / Math.max(said.length, t.length);
    best = Math.max(best, sim);
  }
  return Math.round(best * 100);
}

export function scoreGrade(score: number): { label: string; pass: boolean } {
  if (score >= 90) return { label: "NATIVE-CODED", pass: true };
  if (score >= 75) return { label: "CLEAN", pass: true };
  if (score >= 55) return { label: "GETTING THERE", pass: false };
  return { label: "ONE MORE TIME", pass: false };
}
