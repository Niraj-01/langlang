"use client";

// Word illustrations with graceful absence — the visual sibling of nativeAudio.
//
// scripts/gen-images.mjs ships small webp illustrations to public/images/{lang}/
// indexed by data/image_manifest.json (bundled, so lookups never fetch). Words
// without an image simply render no <img> — cards look exactly as they did
// before the image layer existed. The service worker caches /images/ cache-first,
// so once a card has been seen its illustration works offline forever.

import manifestJson from "@/data/image_manifest.json";
import type { Lang } from "./types";
import { SEED } from "./seed";

interface ImageEntry {
  file: string; // "{seedIndex}.webp" (AI) or "{seedIndex}.svg" (Tabler icon)
  src: string; // "tabler" | "openai" | "gemini"
}

const MANIFEST = manifestJson as unknown as Record<Lang, Record<string, ImageEntry>>;

// Cards don't carry their seed index, so resolve word text → index here
// (same trick as nativeAudio). Only words that have an image are indexed.
const wordIdx: Record<Lang, Map<string, number>> = { ja: new Map(), de: new Map() };
for (const lang of ["ja", "de"] as const) {
  for (const key of Object.keys(MANIFEST[lang])) {
    const entry = SEED[lang][Number(key)];
    if (entry) wordIdx[lang].set(entry.word.trim(), Number(key));
  }
}

/** URL of the illustration for a seed entry, or null (render nothing). */
export function wordImage(lang: Lang, seedIndex: number): string | null {
  const e = MANIFEST[lang][seedIndex];
  return e ? `/images/${lang}/${e.file}` : null;
}

/** Same, resolved from word text — for cards that don't know their seed index. */
export function wordImageFor(text: string, lang: Lang): string | null {
  const i = wordIdx[lang].get(text.trim());
  return i === undefined ? null : wordImage(lang, i);
}

/** How many words have an illustration (drives the Credits line). */
export function imageCount(lang: Lang): number {
  return Object.keys(MANIFEST[lang]).length;
}
