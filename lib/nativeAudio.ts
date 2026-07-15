"use client";

// Native pronunciation audio (real speakers) with graceful TTS fallback.
//
// scripts/gen-audio.mjs ships small opus clips to public/audio/{lang}/ (Kanji
// Alive CC BY 4.0, Common Voice CC0) indexed by data/audio_manifest.json.
// play()/playWord() try the native clip and fall back to speak() (browser TTS)
// on ANY miss — no manifest entry, codec unsupported, fetch failed — so every
// 🔊 behaves identically whether or not a word has downloaded audio. The feed
// never depends on the network: the manifest ships in the JS bundle and the
// service worker serves clips cache-first after the first play.

import manifestJson from "@/data/audio_manifest.json";
import type { Lang } from "./types";
import { SEED } from "./seed";
import { speak } from "./audio";

interface ManifestEntry {
  file: string | null; // word clip, voice 1 (null = sentence-only entry)
  voices: number; // distinct native recordings of the word
  src: string[]; // per-variant source: "ka" (Kanji Alive) | "cv" (Common Voice)
  sentence?: string; // example-sentence clip (Common Voice only)
}

const MANIFEST = manifestJson as unknown as Record<Lang, Record<string, ManifestEntry>>;

// Cards don't carry their seed index, so resolve spoken text → index here.
// Only words that actually have audio are indexed; everything else is TTS.
const wordIdx: Record<Lang, Map<string, number>> = { ja: new Map(), de: new Map() };
const exampleIdx: Record<Lang, Map<string, number>> = { ja: new Map(), de: new Map() };
for (const lang of ["ja", "de"] as const) {
  for (const key of Object.keys(MANIFEST[lang])) {
    const i = Number(key);
    const entry = SEED[lang][i];
    if (!entry) continue;
    if (MANIFEST[lang][key].file) wordIdx[lang].set(entry.word.trim(), i);
    if (MANIFEST[lang][key].sentence && entry.example)
      exampleIdx[lang].set(entry.example.trim(), i);
  }
}

/** Distinct native recordings available for a word (0 = TTS only). */
export function voiceCount(lang: Lang, word: string): number {
  const i = wordIdx[lang].get(word.trim());
  return i === undefined ? 0 : MANIFEST[lang][i].voices;
}

// Old Safari can't decode opus-in-ogg — skip the doomed fetch, go straight
// to TTS (iOS/macOS Safari 18.4+ and every Chrome/Firefox play it fine).
let opusSupport: boolean | null = null;
function canOpus(): boolean {
  if (opusSupport === null) {
    opusSupport =
      typeof Audio !== "undefined" &&
      new Audio().canPlayType('audio/ogg; codecs="opus"') !== "";
  }
  return opusSupport;
}

// variant slot k (1-based) → file name; mirrors scripts/gen-audio.mjs
const variantFile = (index: number, k: number) =>
  k <= 1 ? `${index}.opus` : `${index}.${k}.opus`;

let current: HTMLAudioElement | null = null;

/** Resolves when the clip finishes; runs `fallback` (once) if it can't play. */
function playFile(url: string, fallback: () => void): Promise<void> {
  return new Promise((resolve) => {
    if (typeof window === "undefined") return resolve();
    window.speechSynthesis?.cancel();
    current?.pause();
    let settled = false;
    const fail = () => {
      if (settled) return;
      settled = true;
      fallback();
      resolve();
    };
    const a = new Audio(url);
    current = a;
    a.onended = () => {
      if (!settled) {
        settled = true;
        resolve();
      }
    };
    a.onerror = fail;
    a.play().catch(fail);
  });
}

export interface PlayOpts {
  rate?: number; // TTS fallback only
  variant?: number; // 1-based voice variant; clamped to what exists
}

/** Play the native word clip for a seed entry, TTS if there isn't one. */
export function play(lang: Lang, seedIndex: number, opts: PlayOpts = {}): Promise<void> {
  const entry = MANIFEST[lang][seedIndex];
  const text = SEED[lang][seedIndex]?.word ?? "";
  if (!entry?.file || !canOpus()) {
    speak(text, lang, opts.rate);
    return Promise.resolve();
  }
  const k = Math.min(Math.max(opts.variant ?? 1, 1), entry.voices);
  return playFile(`/audio/${lang}/${variantFile(seedIndex, k)}`, () =>
    speak(text, lang, opts.rate)
  );
}

/**
 * Drop-in replacement for speak(): plays the native clip when `text` is a
 * seed word (or an example sentence with recorded audio), else browser TTS.
 */
export function playWord(text: string, lang: Lang, opts: PlayOpts = {}): Promise<void> {
  const t = text.trim();
  const wi = wordIdx[lang].get(t);
  if (wi !== undefined) return play(lang, wi, opts);
  const si = exampleIdx[lang].get(t);
  if (si !== undefined && canOpus()) {
    return playFile(`/audio/${lang}/${MANIFEST[lang][si].sentence}`, () =>
      speak(text, lang, opts.rate)
    );
  }
  speak(text, lang, opts.rate);
  return Promise.resolve();
}
