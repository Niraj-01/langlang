// Image layer: the manifest is the single source of truth for which seed
// words have an illustration. Same honesty contract as tests/audio.test.ts —
// a manifest pointing at a missing/oversized/corrupt file would silently show
// broken images on cards (there's no runtime fallback beyond "no <img>").
// All checks are vacuously green while the manifest is empty, so the
// scaffolding ships before the first gen-images run.

import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { SEED } from "@/lib/seed";
import { wordImage, wordImageFor, imageCount } from "@/lib/wordImage";
import manifest from "@/data/image_manifest.json";

type Entry = { file: string; src: string };
const M = manifest as unknown as Record<"ja" | "de", Record<string, Entry>>;
const LANGS = ["ja", "de"] as const;

const MAX_BYTES = 64 * 1024;
const dir = (lang: string) => join("public", "images", lang);

describe("image manifest ↔ shipped files", () => {
  it("every entry points at a real seed index with the canonical file name", () => {
    for (const lang of LANGS) {
      for (const [key, e] of Object.entries(M[lang])) {
        const i = Number(key);
        expect(Number.isInteger(i) && i >= 0 && i < SEED[lang].length, `${lang}:${key}`).toBe(true);
        // webp = AI-generated raster, svg = Tabler icon tier
        expect(e.file, `${lang}:${key} file name`).toMatch(new RegExp(`^${key}\\.(webp|svg)$`));
        expect(typeof e.src, `${lang}:${key} src`).toBe("string");
      }
    }
  });

  it("every referenced image exists, has the right format, and fits the 64KB budget", () => {
    for (const lang of LANGS) {
      for (const e of Object.values(M[lang])) {
        const p = join(dir(lang), e.file);
        expect(existsSync(p), `${p} missing`).toBe(true);
        const bytes = readFileSync(p);
        expect(bytes.length, `${p} over budget`).toBeLessThanOrEqual(MAX_BYTES);
        if (e.file.endsWith(".webp")) {
          expect(bytes.subarray(0, 4).toString(), `${p} not RIFF`).toBe("RIFF");
          expect(bytes.subarray(8, 12).toString(), `${p} not webp`).toBe("WEBP");
        } else {
          expect(bytes.subarray(0, 4).toString(), `${p} not svg`).toBe("<svg");
        }
      }
    }
  });

  it("no orphan files ship outside the manifest", () => {
    for (const lang of LANGS) {
      if (!existsSync(dir(lang))) continue;
      for (const f of readdirSync(dir(lang))) {
        const m = f.match(/^(\d+)\.(webp|svg)$/);
        expect(m, `${lang}/${f} has an unexpected name`).toBeTruthy();
        // exact-file match also catches a stale svg left behind by an AI upgrade
        expect(M[lang][m![1]]?.file, `${lang}/${f} not in manifest`).toBe(f);
      }
    }
  });
});

describe("wordImage runtime", () => {
  it("resolves manifest entries by index and by word, null otherwise", () => {
    for (const lang of LANGS) {
      expect(imageCount(lang)).toBe(Object.keys(M[lang]).length);
      expect(wordImage(lang, 999999)).toBeNull();
      expect(wordImageFor("definitely-not-a-seed-word", lang)).toBeNull();
      const first = Object.keys(M[lang])[0];
      if (first !== undefined) {
        const url = `/images/${lang}/${M[lang][first].file}`;
        expect(wordImage(lang, Number(first))).toBe(url);
        expect(wordImageFor(SEED[lang][Number(first)].word, lang)).toBe(url);
      }
    }
  });
});
