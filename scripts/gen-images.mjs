// gen-images — flat illustration per seed word (build-time only).
//
//   npm run gen-images                                  # free: Tabler icon pass
//   npm run gen-images -- --provider openai --limit 25  # AI pilot slice
//   npm run gen-images -- --provider gemini --limit 0   # AI, everything
//
// Sources:
//   - tabler (FREE, the default): @tabler/icons outline SVGs (MIT, credited in
//     Profile → Credits), matched through data/word_icons.json (normalized
//     English gloss → icon name, hand-authored) and recolored to the language
//     accent. Ships ~1KB SVGs. Matches the app's Phase-9 monochrome line-icon
//     design system exactly.
//   - openai / gemini (PAID, explicit --provider only, key in .env.local):
//     AI-rendered flat illustrations. gpt-image-1 quality low ≈ $0.011/image;
//     gemini-3.1-flash-lite-image via the Interactions API ≈ $0.034/image
//     (Google grants NO free-tier image quota — billing must be enabled).
//     AI images UPGRADE over tabler entries for the same word; raw output is
//     cached in .cache/images/ so re-runs never re-bill; ffmpeg transcodes to
//     512×512 webp within the 64KB budget. Generated most-frequent-first.
// Either way the pipeline is generation-time only — the app itself NEVER
// fetches from an API; images ship as static files.
//
// Both sources skip parts of speech a picture can't teach (particles, …).
//
// Output:
//   public/images/{lang}/{index}.webp|svg  one illustration per seed word
//   data/image_manifest.json               { lang: { seedIndex: { file, src } } }
//
// The manifest is optional at runtime (lib/wordImage.ts): words without an
// image render exactly as before — same universal-fallback rule as audio/TTS.

import { execFileSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
  readdirSync,
  unlinkSync,
} from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const ROOT = path.join(import.meta.dirname, "..");
const CACHE = path.join(ROOT, ".cache", "images");
const OUT_MANIFEST = path.join(ROOT, "data", "image_manifest.json");
const MAX_BYTES = 64 * 1024;
const SIZE = 512;

// .env.local isn't auto-loaded outside Next — read keys from it if present
for (const key of ["OPENAI_API_KEY", "GEMINI_API_KEY"]) {
  if (!process.env[key]) {
    const envFile = path.join(ROOT, ".env.local");
    if (existsSync(envFile)) {
      const m = readFileSync(envFile, "utf8").match(new RegExp(`^${key}=(.+)$`, "m"));
      if (m) process.env[key] = m[1].trim();
    }
  }
}

// ---------------------------------------------------------------- seeds
// Concatenation order MUST match lib/seed.ts LEVELS (append-only contract).
const SEED = {
  ja: [
    ...JSON.parse(readFileSync(path.join(ROOT, "data/jlpt_n5.json"), "utf8")),
    ...JSON.parse(readFileSync(path.join(ROOT, "data/jlpt_n4.json"), "utf8")),
    ...JSON.parse(readFileSync(path.join(ROOT, "data/jlpt_n5_gap.json"), "utf8")),
    ...JSON.parse(readFileSync(path.join(ROOT, "data/jlpt_n4_gap.json"), "utf8")),
    ...JSON.parse(readFileSync(path.join(ROOT, "data/jlpt_n5_gap2.json"), "utf8")),
    ...JSON.parse(readFileSync(path.join(ROOT, "data/jlpt_n4_gap2.json"), "utf8")),
  ],
  de: [
    ...JSON.parse(readFileSync(path.join(ROOT, "data/goethe_a1.json"), "utf8")),
    ...JSON.parse(readFileSync(path.join(ROOT, "data/goethe_a2.json"), "utf8")),
    ...JSON.parse(readFileSync(path.join(ROOT, "data/goethe_a1_gap.json"), "utf8")),
    ...JSON.parse(readFileSync(path.join(ROOT, "data/goethe_a2_gap.json"), "utf8")),
    ...JSON.parse(readFileSync(path.join(ROOT, "data/goethe_a1_gap2.json"), "utf8")),
    ...JSON.parse(readFileSync(path.join(ROOT, "data/goethe_a2_gap2.json"), "utf8")),
  ],
};

// pos that a picture can't teach — generating these wastes money and produces
// confusing quiz distractors, so they stay TTS/text-only
const UNPICTURABLE = new Set([
  "particle",
  "article",
  "conjunction",
  "preposition",
  "determiner",
  "pronoun",
  "suffix",
  "counter",
  "prenominal",
]);

// ---------------------------------------------------------------- args
const args = process.argv.slice(2);
const flag = (name) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : undefined;
};
const onlyLang = flag("lang");
const limitArg = flag("limit");
const LIMIT = limitArg === "0" ? Infinity : Number(limitArg ?? 100);
const forcedProvider = flag("provider");

// ---------------------------------------------------------------- providers
const ACCENT = { ja: "warm red-orange", de: "chartreuse yellow-green" };

function prompt(entry, lang) {
  return (
    `Minimal flat illustration for a language-learning flashcard depicting the concept: ` +
    `"${entry.meaning}" (${entry.pos}). Simple bold geometric shapes, dark charcoal ` +
    `background, one vivid ${ACCENT[lang]} accent color plus off-white, high contrast, ` +
    `centered composition, generous margins. Absolutely no text, letters, numbers, ` +
    `characters, or writing of any kind anywhere in the image.`
  );
}

async function genOpenAI(text) {
  const res = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-image-1",
      prompt: text,
      size: "1024x1024",
      quality: "low",
      output_format: "png",
    }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = body?.error?.message ?? `HTTP ${res.status}`;
    throw new Error(`openai: ${msg}`, { cause: res.status });
  }
  return Buffer.from(body.data[0].b64_json, "base64");
}

// The Gemini *-image models moved off generateContent onto the Interactions
// API (POST /v1beta/interactions; the old endpoint 404s for them). jpeg is the
// only supported response mime — fine, ffmpeg turns it into webp anyway.
const GEMINI_MODEL = process.env.GEMINI_IMAGE_MODEL ?? "gemini-3.1-flash-lite-image";

// response nesting isn't pinned down in the docs — find the first plausibly
// base64-image "data" string wherever it lives
function findB64(o) {
  if (!o || typeof o !== "object") return null;
  for (const [k, v] of Object.entries(o)) {
    if (k === "data" && typeof v === "string" && v.length > 1000) return v;
    if (typeof v === "object") {
      const r = findB64(v);
      if (r) return r;
    }
  }
  return null;
}

async function genGemini(text) {
  const res = await fetch("https://generativelanguage.googleapis.com/v1beta/interactions", {
    method: "POST",
    headers: {
      "x-goog-api-key": process.env.GEMINI_API_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: GEMINI_MODEL,
      input: [{ type: "text", text }],
      response_format: {
        type: "image",
        mime_type: "image/jpeg",
        aspect_ratio: "1:1",
        image_size: "1K",
      },
    }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = body?.error?.message ?? `HTTP ${res.status}`;
    throw new Error(`gemini: ${msg}`, { cause: res.status });
  }
  const b64 = findB64(body);
  if (!b64) throw new Error("gemini: response had no image data");
  return Buffer.from(b64, "base64");
}

function pickProvider() {
  if (forcedProvider === "tabler" || !forcedProvider) return null; // free icon pass
  if (forcedProvider === "openai")
    return process.env.OPENAI_API_KEY
      ? { name: "openai", gen: genOpenAI }
      : bail("--provider openai needs OPENAI_API_KEY in .env.local");
  if (forcedProvider === "gemini")
    return process.env.GEMINI_API_KEY
      ? { name: "gemini", gen: genGemini }
      : bail("--provider gemini needs GEMINI_API_KEY in .env.local");
  bail(`unknown provider "${forcedProvider}" — use tabler, openai, or gemini`);
}
const bail = (msg) => {
  console.error(msg);
  process.exit(1);
};

// ---------------------------------------------------------------- tabler
// Free source: Tabler outline icons (MIT), matched by normalized English
// gloss. Deterministic and rebuilt from scratch each run (tabler entries only
// — AI-generated webps are never touched), so map edits are self-cleaning.
const ICONS_DIR = path.join(ROOT, "node_modules", "@tabler", "icons", "icons", "outline");
const ICON_MAP_FILE = path.join(ROOT, "data", "word_icons.json");
const ACCENT_HEX = { ja: "#ff3b1f", de: "#d8f000" }; // .lang-ja/.lang-de --accent

// meaning → map key: first gloss alternative, lowercased, no "to "/parens.
// data/word_icons.json keys are authored in EXACTLY this form.
const normGloss = (m) =>
  m
    .toLowerCase()
    .split(/[;,/]/)[0]
    .replace(/^to /, "")
    .replace(/\(.*?\)/g, "")
    .trim();

/** Tabler svg → branded card illustration: accent stroke + inner margin. */
function brandSvg(svg, accent) {
  return svg
    .replace('stroke="currentColor"', `stroke="${accent}"`)
    .replace('viewBox="0 0 24 24"', 'viewBox="-5 -5 34 34"')
    .replace(/\s+class="[^"]*"/, "")
    .replace(/\s+width="24"/, "")
    .replace(/\s+height="24"/, "")
    .replace(/\n\s*/g, " ")
    .trim();
}

function runTabler(manifest) {
  if (!existsSync(ICONS_DIR))
    bail("@tabler/icons is not installed — `npm i -D @tabler/icons`, then re-run.");
  const map = JSON.parse(readFileSync(ICON_MAP_FILE, "utf8"));
  const missing = new Set();
  const langs = onlyLang ? [onlyLang] : ["ja", "de"];
  for (const lang of langs) {
    if (!SEED[lang]) bail(`unknown lang "${lang}" — use ja or de`);
    const dir = imagesDir(lang);
    // wipe this source's previous output (map edits must un-map cleanly)
    for (const [key, e] of Object.entries(manifest[lang])) {
      if (e.src !== "tabler") continue;
      const f = path.join(dir, e.file);
      if (existsSync(f)) unlinkSync(f);
      delete manifest[lang][key];
    }
    let done = 0;
    SEED[lang].forEach((e, index) => {
      if (UNPICTURABLE.has(e.pos)) return;
      if (manifest[lang][index]) return; // an AI illustration already won
      const name = map[`${lang}:${index}`] ?? map[normGloss(e.meaning)];
      if (!name) return;
      const src = path.join(ICONS_DIR, `${name}.svg`);
      if (!existsSync(src)) {
        missing.add(name);
        return;
      }
      writeFileSync(
        path.join(dir, `${index}.svg`),
        brandSvg(readFileSync(src, "utf8"), ACCENT_HEX[lang]) + "\n"
      );
      manifest[lang][index] = { file: `${index}.svg`, src: "tabler" };
      done++;
    });
    console.log(`tabler(${lang}): ${done} words got an icon`);
  }
  if (missing.size)
    console.warn(`word_icons.json names not in @tabler/icons: ${[...missing].sort().join(", ")}`);
  writeManifest(manifest);
  report(manifest);
}

// ---------------------------------------------------------------- transcode
function findFfmpeg() {
  try {
    execFileSync("ffmpeg", ["-version"], { stdio: "ignore" });
    return "ffmpeg";
  } catch {
    /* not on PATH */
  }
  try {
    return createRequire(import.meta.url)("ffmpeg-static");
  } catch {
    return null;
  }
}

const isWebp = (buf) =>
  buf.length > 12 && buf.subarray(0, 4).toString() === "RIFF" && buf.subarray(8, 12).toString() === "WEBP";

/** raw API image → square SIZE×SIZE webp within budget (lowering q as needed) */
function toWebp(ffmpeg, raw, tmpDir) {
  const src = path.join(tmpDir, "raw.img");
  const out = path.join(tmpDir, "out.webp");
  writeFileSync(src, raw);
  for (const q of [80, 65, 50, 35]) {
    execFileSync(
      ffmpeg,
      ["-y", "-v", "error", "-i", src, "-vf", `scale=${SIZE}:${SIZE}`, "-c:v", "libwebp", "-q:v", String(q), out],
      { stdio: "ignore" }
    );
    const bytes = readFileSync(out);
    if (isWebp(bytes) && bytes.length <= MAX_BYTES) return bytes;
  }
  return null;
}

// ---------------------------------------------------------------- manifest
function loadManifest() {
  if (!existsSync(OUT_MANIFEST)) return { ja: {}, de: {} };
  const m = JSON.parse(readFileSync(OUT_MANIFEST, "utf8"));
  return { ja: m.ja ?? {}, de: m.de ?? {} };
}

function imagesDir(lang) {
  const dir = path.join(ROOT, "public", "images", lang);
  mkdirSync(dir, { recursive: true });
  return dir;
}

function writeManifest(manifest) {
  writeFileSync(OUT_MANIFEST, JSON.stringify(manifest, null, 1) + "\n");
}

function report(manifest) {
  for (const lang of ["ja", "de"]) {
    const dir = path.join(ROOT, "public", "images", lang);
    const bytes = existsSync(dir)
      ? readdirSync(dir).reduce((n, f) => n + readFileSync(path.join(dir, f)).length, 0)
      : 0;
    console.log(
      `manifest: ${lang} ${Object.keys(manifest[lang]).length}/${SEED[lang].length} words (${(bytes / 1024).toFixed(0)}KB)`
    );
  }
}

// ---------------------------------------------------------------- main
async function main() {
  const manifest = loadManifest();
  // prune entries whose files vanished (e.g. a deleted bad image regenerates)
  for (const lang of ["ja", "de"]) {
    for (const key of Object.keys(manifest[lang])) {
      if (!existsSync(path.join(ROOT, "public/images", lang, manifest[lang][key].file)))
        delete manifest[lang][key];
    }
  }

  const provider = pickProvider();
  if (!provider) return runTabler(manifest);

  const ffmpeg = findFfmpeg();
  if (!ffmpeg) {
    console.error("ffmpeg is required to compress images to webp.");
    console.error("Install it (brew install ffmpeg) or `npm i -D ffmpeg-static`, then re-run.");
    process.exit(1);
  }

  const langs = onlyLang ? [onlyLang] : ["ja", "de"];
  for (const lang of langs) {
    if (!SEED[lang]) bail(`unknown lang "${lang}" — use ja or de`);
    const dir = imagesDir(lang);
    const cacheDir = path.join(CACHE, lang);
    mkdirSync(cacheDir, { recursive: true });

    // most-frequent-first, skipping unpicturable pos and words already done —
    // but a tabler icon is only a placeholder tier: AI regenerates over it
    const todo = SEED[lang]
      .map((e, index) => ({ e, index }))
      .filter(
        ({ e, index }) =>
          !UNPICTURABLE.has(e.pos) &&
          (!manifest[lang][index] || manifest[lang][index].src === "tabler")
      )
      .sort(
        (a, b) => (a.e.freqRank ?? Infinity) - (b.e.freqRank ?? Infinity) || a.index - b.index
      )
      .slice(0, LIMIT);

    let done = 0;
    for (const { e, index } of todo) {
      const cached = path.join(cacheDir, `${index}.img`);
      try {
        let raw;
        if (existsSync(cached)) {
          raw = readFileSync(cached);
        } else {
          raw = await provider.gen(prompt(e, lang));
          writeFileSync(cached, raw); // cache BEFORE transcode: never re-bill
        }
        const webp = toWebp(ffmpeg, raw, cacheDir);
        if (!webp) {
          console.warn(`  ${lang}/${index} (${e.word}): couldn't fit budget, skipped`);
          continue;
        }
        // upgrading over a tabler icon: remove the svg it replaces
        const prev = manifest[lang][index];
        if (prev && prev.file !== `${index}.webp`) {
          const stale = path.join(dir, prev.file);
          if (existsSync(stale)) unlinkSync(stale);
        }
        writeFileSync(path.join(dir, `${index}.webp`), webp);
        manifest[lang][index] = { file: `${index}.webp`, src: provider.name };
        writeManifest(manifest); // land each image as it arrives (resumable)
        done++;
        console.log(`  ${lang}/${index} ${e.word} → ${(webp.length / 1024).toFixed(0)}KB`);
      } catch (err) {
        // quota/billing errors end the run gracefully; the cache keeps progress
        const status = err.cause;
        console.error(`  ${lang}/${index} (${e.word}): ${err.message}`);
        if (status === 401 || status === 402 || status === 429) {
          console.error("Stopping (auth/credits/rate limit). Re-run to resume where this left off.");
          report(manifest);
          process.exit(1);
        }
      }
    }
    console.log(`${provider.name}(${lang}): ${done}/${todo.length} generated`);
  }
  report(manifest);
}

main();
