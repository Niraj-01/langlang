// Native audio layer: the manifest is the single source of truth for which
// seed words have real recordings. These tests keep it honest against the
// files actually shipped in public/audio/ — a manifest that points at a
// missing/oversized/corrupt file would silently kill playback (the runtime
// falls back to TTS, so nobody would notice in dev).

import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { SEED } from "@/lib/seed";
import { voiceCount, play, playWord } from "@/lib/nativeAudio";
import { buildListenPair } from "@/lib/feed";
import manifest from "@/data/audio_manifest.json";

type Entry = { file: string | null; voices: number; src: string[]; sentence?: string };
const M = manifest as unknown as Record<"ja" | "de", Record<string, Entry>>;
const LANGS = ["ja", "de"] as const;

const MAX_BYTES = 50 * 1024;
const MAX_FILES_PER_LANG = 400 * 3; // ≤ ~400 words/lang, up to 3 voices each

const dir = (lang: string) => join("public", "audio", lang);
const variantFile = (i: string, k: number) => (k <= 1 ? `${i}.opus` : `${i}.${k}.opus`);

describe("audio manifest ↔ shipped files", () => {
  it("every entry points at a real seed index with valid voice metadata", () => {
    for (const lang of LANGS) {
      for (const [key, e] of Object.entries(M[lang])) {
        const i = Number(key);
        expect(Number.isInteger(i) && i >= 0 && i < SEED[lang].length, `${lang}:${key}`).toBe(true);
        expect(e.voices).toBeLessThanOrEqual(3);
        expect(e.src.length, `${lang}:${key} src`).toBe(e.voices);
        if (e.file) expect(e.file).toBe(variantFile(key, 1));
        else expect(e.sentence, `${lang}:${key} must have SOME audio`).toBeTruthy();
      }
    }
  });

  it("every referenced clip exists, is opus, and is within the 50KB budget", () => {
    for (const lang of LANGS) {
      for (const [key, e] of Object.entries(M[lang])) {
        const files = [
          ...(e.file ? Array.from({ length: e.voices }, (_, k) => variantFile(key, k + 1)) : []),
          ...(e.sentence ? [e.sentence] : []),
        ];
        for (const f of files) {
          const p = join(dir(lang), f);
          expect(existsSync(p), `${p} missing`).toBe(true);
          const bytes = readFileSync(p);
          expect(bytes.length, `${p} over budget`).toBeLessThanOrEqual(MAX_BYTES);
          expect(bytes.subarray(0, 4).toString(), `${p} not ogg/opus`).toBe("OggS");
        }
      }
    }
  });

  it("no orphan files ship outside the manifest, and the repo stays lean", () => {
    for (const lang of LANGS) {
      if (!existsSync(dir(lang))) continue;
      const files = readdirSync(dir(lang));
      expect(files.length).toBeLessThanOrEqual(MAX_FILES_PER_LANG);
      for (const f of files) {
        const m = f.match(/^(\d+)(?:\.(\d|s))?\.opus$/);
        expect(m, `${lang}/${f} has an unexpected name`).toBeTruthy();
        const e = M[lang][m![1]];
        expect(e, `${lang}/${f} not in manifest`).toBeTruthy();
        if (m![2] === "s") expect(e.sentence).toBe(f);
        else if (m![2]) expect(Number(m![2])).toBeLessThanOrEqual(e.voices);
      }
    }
  });
});

describe("nativeAudio runtime", () => {
  it("voiceCount reflects the manifest (and 0 for TTS-only words)", () => {
    const [key, e] = Object.entries(M.ja)[0];
    expect(voiceCount("ja", SEED.ja[Number(key)].word)).toBe(e.voices);
    expect(voiceCount("ja", "not-a-seed-word")).toBe(0);
    expect(voiceCount("de", SEED.de[0].word)).toBe(Object.keys(M.de).length ? M.de["0"]?.voices ?? 0 : 0);
  });

  it("play/playWord never throw without a DOM (TTS fallback is a no-op)", async () => {
    await expect(play("ja", 0)).resolves.toBeUndefined();
    await expect(play("ja", 999999)).resolves.toBeUndefined();
    await expect(playWord("水", "ja")).resolves.toBeUndefined();
    await expect(playWord("完全に未知の言葉", "ja")).resolves.toBeUndefined();
  });
});

describe("same-word/different-voice listen pairs", () => {
  // a word with 2+ recorded voices must exist for the mode to ever trigger
  const multi = Object.entries(M.ja).find(([, e]) => e.voices >= 2);

  it("the shipped data actually contains multi-voice words", () => {
    expect(multi).toBeTruthy();
  });

  it("pairs are always answerable: same → two variants of one word, different → both words have audio", () => {
    const word = SEED.ja[Number(multi![0])].word;
    const voices = multi![1].voices;
    for (let n = 0; n < 100; n++) {
      const pair = buildListenPair("ja", word, voices);
      expect(pair).toBeTruthy();
      expect(pair!.a.word).toBe(word);
      expect(pair!.a.variant).toBeGreaterThanOrEqual(1);
      expect(pair!.a.variant).toBeLessThanOrEqual(voices);
      if (pair!.same) {
        expect(pair!.b.word).toBe(word);
        expect(pair!.b.variant).not.toBe(pair!.a.variant);
        expect(pair!.b.variant).toBeLessThanOrEqual(voices);
      } else {
        expect(pair!.b.word).not.toBe(word);
        expect(voiceCount("ja", pair!.b.word)).toBeGreaterThanOrEqual(pair!.b.variant);
      }
    }
  });
});
