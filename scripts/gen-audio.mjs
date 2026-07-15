// gen-audio — native pronunciation audio for seed vocab (build-time only).
//
//   npm run gen-audio                                   # Kanji Alive (ja)
//   npm run gen-audio -- kanjialive                     # same, explicit
//   npm run gen-audio -- commonvoice <dataset-dir>      # Common Voice (ja or de)
//
// Sources (both openly licensed, credited in Profile → Credits):
//   - Kanji Alive example-word audio, CC BY 4.0
//     (github.com/kanjialive/kanji-data-media; media zip is downloaded once and
//     cached in .cache/audio/, gitignored). Native speakers, one clip per
//     example word; the same word recorded under several kanji lessons gives us
//     genuine multi-speaker variants.
//   - Mozilla Common Voice, CC0 (commonvoice.mozilla.org). The datasets are
//     tens of GB, so this source NEVER downloads: point it at a locally
//     extracted dataset dir (the folder holding validated.tsv + clips/), e.g.
//       npm run gen-audio -- commonvoice ~/Downloads/cv-corpus-22.0/ja
//     Locale is read from validated.tsv rows (or the dir name). Requires
//     ffmpeg on PATH (or `npm i -D ffmpeg-static`) to transcode mp3 → opus.
//
// Matching: a clip is used only when its transcript IS a seed word (ja: word or
// kana reading; de: case/punctuation-insensitive) — or, for Common Voice, a
// seed entry's full example sentence.
//
// Output:
//   public/audio/{lang}/{index}.opus         word, voice 1 (≤ 50KB, mono opus)
//   public/audio/{lang}/{index}.{k}.opus     word, voices 2..3 (when they exist)
//   public/audio/{lang}/{index}.s.opus       example sentence (Common Voice only)
//   data/audio_manifest.json                 { lang: { seedIndex: { file, voices, src, sentence? } } }
//
// Runs are idempotent and composable: each run rebuilds only ITS source's
// contributions (tracked per-variant in `src`), preserving the other source's
// clips. Kanji Alive variants always sort before Common Voice ones, so file
// names stay stable no matter the run order. The app treats this manifest as
// optional — every word without audio falls back to browser TTS at runtime.

import { execFileSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
  readdirSync,
  unlinkSync,
} from "node:fs";
import { createHash } from "node:crypto";
import path from "node:path";
import { createRequire } from "node:module";

const ROOT = path.join(import.meta.dirname, "..");
const CACHE = path.join(ROOT, ".cache", "audio");
const OUT_MANIFEST = path.join(ROOT, "data", "audio_manifest.json");
const MAX_BYTES = 50 * 1024; // hard per-file budget from the spec
const MAX_VOICES = 3;

const KA_ZIP_URL = "https://media.kanjialive.com/examples_audio/audio-opus.zip";
const KA_CSV_URL =
  "https://raw.githubusercontent.com/kanjialive/kanji-data-media/master/language-data/ka_data.csv";

// ---------------------------------------------------------------- seeds
// Concatenation order MUST match lib/seed.ts LEVELS (append-only contract):
// ja = N5 then N4; de = A1 then A2. The array index IS the manifest key.
const SEED = {
  ja: [
    ...JSON.parse(readFileSync(path.join(ROOT, "data/jlpt_n5.json"), "utf8")),
    ...JSON.parse(readFileSync(path.join(ROOT, "data/jlpt_n4.json"), "utf8")),
  ],
  de: [
    ...JSON.parse(readFileSync(path.join(ROOT, "data/goethe_a1.json"), "utf8")),
    ...JSON.parse(readFileSync(path.join(ROOT, "data/goethe_a2.json"), "utf8")),
  ],
};

// ---------------------------------------------------------------- helpers
function parseCsv(text) {
  const rows = [];
  let row = [],
    field = "",
    inQ = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQ) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else inQ = false;
      } else field += c;
    } else if (c === '"') inQ = true;
    else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n") {
      row.push(field.replace(/\r$/, ""));
      rows.push(row);
      row = [];
      field = "";
    } else field += c;
  }
  if (field || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

const sha1 = (buf) => createHash("sha1").update(buf).digest("hex");

/** variant slot k (1-based) → file name */
const variantFile = (index, k) => (k === 1 ? `${index}.opus` : `${index}.${k}.opus`);

function loadManifest() {
  if (!existsSync(OUT_MANIFEST)) return { ja: {}, de: {} };
  const m = JSON.parse(readFileSync(OUT_MANIFEST, "utf8"));
  return { ja: m.ja ?? {}, de: m.de ?? {} };
}

function audioDir(lang) {
  const dir = path.join(ROOT, "public", "audio", lang);
  mkdirSync(dir, { recursive: true });
  return dir;
}

/**
 * Merge one source's fresh clips into the manifest for a language, preserving
 * the other source's existing on-disk variants. `fresh` is
 * Map<seedIndex, { word: Buffer[], sentence?: Buffer }>.
 */
function mergeSource(manifest, lang, source, fresh) {
  const dir = audioDir(lang);
  const entries = manifest[lang];
  const SRC_ORDER = { ka: 0, cv: 1 };
  const indices = new Set([...Object.keys(entries).map(Number), ...fresh.keys()]);

  for (const index of [...indices].sort((a, b) => a - b)) {
    const prev = entries[index];
    // carry over variants owned by the OTHER source (read bytes before unlink)
    const kept = [];
    if (prev) {
      (prev.src ?? []).forEach((s, i) => {
        if (s === source) return;
        const f = path.join(dir, variantFile(index, i + 1));
        if (existsSync(f)) kept.push({ src: s, bytes: readFileSync(f) });
      });
    }
    const mine = (fresh.get(index)?.word ?? []).map((bytes) => ({ src: source, bytes }));
    const variants = [...kept, ...mine]
      .sort((a, b) => SRC_ORDER[a.src] - SRC_ORDER[b.src])
      .slice(0, MAX_VOICES);

    // sentence clip is Common Voice-only; other-source runs leave it alone
    let sentence = prev?.sentence;
    let sentenceBytes = null;
    if (source === "cv") {
      sentence = undefined;
      sentenceBytes = fresh.get(index)?.sentence ?? null;
    } else if (sentence && existsSync(path.join(dir, sentence))) {
      sentenceBytes = readFileSync(path.join(dir, sentence));
    } else {
      sentence = undefined;
    }

    // wipe this index's old files, then lay the new set down
    for (const f of readdirSync(dir)) {
      if (f === `${index}.opus` || f.startsWith(`${index}.`)) unlinkSync(path.join(dir, f));
    }
    if (variants.length === 0 && !sentenceBytes) {
      delete entries[index];
      continue;
    }
    variants.forEach((v, i) => writeFileSync(path.join(dir, variantFile(index, i + 1)), v.bytes));
    const entry = {
      file: variantFile(index, 1),
      voices: variants.length,
      src: variants.map((v) => v.src),
    };
    if (sentenceBytes) {
      entry.sentence = `${index}.s.opus`;
      writeFileSync(path.join(dir, entry.sentence), sentenceBytes);
    }
    if (variants.length === 0) {
      // sentence-only entry (rare): keep the shape but flag zero word voices
      entry.file = null;
      entry.voices = 0;
      entry.src = [];
    }
    entries[index] = entry;
  }
}

function writeManifest(manifest) {
  writeFileSync(OUT_MANIFEST, JSON.stringify(manifest, null, 1) + "\n");
  const count = (l) => Object.keys(manifest[l]).length;
  const bytes = (l) =>
    existsSync(path.join(ROOT, "public/audio", l))
      ? readdirSync(path.join(ROOT, "public/audio", l)).reduce(
          (n, f) => n + readFileSync(path.join(ROOT, "public/audio", l, f)).length,
          0
        )
      : 0;
  console.log(
    `manifest: ja ${count("ja")}/${SEED.ja.length} words (${(bytes("ja") / 1024).toFixed(0)}KB), ` +
      `de ${count("de")}/${SEED.de.length} words (${(bytes("de") / 1024).toFixed(0)}KB)`
  );
}

const okOpus = (buf) =>
  buf.length > 0 && buf.length <= MAX_BYTES && buf.subarray(0, 4).toString() === "OggS";

// ---------------------------------------------------------------- kanji alive
function runKanjiAlive() {
  mkdirSync(CACHE, { recursive: true });
  const zip = path.join(CACHE, "audio-opus.zip");
  const csv = path.join(CACHE, "ka_data.csv");
  const extracted = path.join(CACHE, "audio-opus");
  if (!existsSync(zip)) {
    console.log("downloading Kanji Alive audio (69MB, once — cached in .cache/audio/)");
    execFileSync("curl", ["-sfL", "--max-time", "900", "-o", zip, KA_ZIP_URL], {
      stdio: "inherit",
    });
  }
  if (!existsSync(csv)) {
    execFileSync("curl", ["-sfL", "--max-time", "120", "-o", csv, KA_CSV_URL], {
      stdio: "inherit",
    });
  }
  if (!existsSync(extracted)) execFileSync("unzip", ["-qo", zip, "-d", CACHE]);

  // audio file index: `${kname}|${letter}` → absolute path. File names look
  // like `jutsu-no(beru)_06_a.opus`; the letter matches the alphabetical
  // position of the example word in that kanji's `examples` column.
  const fileIdx = new Map();
  for (const f of readdirSync(extracted)) {
    const m = f.match(/^(.+)_(\d+)_([a-z])\.opus$/);
    if (m) fileIdx.set(`${m[1]}|${m[3]}`, path.join(extracted, f));
  }

  // word index: `word|reading` → file paths (a word can be recorded under
  // several kanji lessons — those are distinct speakers, i.e. real variants)
  const rows = parseCsv(readFileSync(csv, "utf8"));
  const header = rows[0];
  const nameCol = header.indexOf("kname");
  const exCol = header.indexOf("examples");
  const wordIdx = new Map();
  for (const r of rows.slice(1)) {
    let examples;
    try {
      examples = JSON.parse(r[exCol]);
    } catch {
      continue;
    }
    examples.forEach(([jp], i) => {
      const m = String(jp).trim().match(/^(.+?)（(.+?)）$/); // 水（みず）
      if (!m) return;
      const file = fileIdx.get(`${r[nameCol]}|${String.fromCharCode(97 + i)}`);
      if (!file) return;
      const key = `${m[1].trim()}|${m[2].trim()}`;
      if (!wordIdx.has(key)) wordIdx.set(key, []);
      wordIdx.get(key).push(file);
    });
  }

  const fresh = new Map();
  let matched = 0;
  let variantWords = 0;
  SEED.ja.forEach((e, index) => {
    const files = wordIdx.get(`${e.word}|${(e.reading ?? e.word).trim()}`);
    if (!files) return;
    // deterministic order + content-hash dedupe (identical takes reused
    // across lessons must not count as extra "voices")
    const seen = new Set();
    const clips = [];
    for (const f of [...files].sort()) {
      const bytes = readFileSync(f);
      if (!okOpus(bytes)) continue;
      const h = sha1(bytes);
      if (seen.has(h)) continue;
      seen.add(h);
      clips.push(bytes);
      if (clips.length === MAX_VOICES) break;
    }
    if (clips.length === 0) return;
    matched++;
    if (clips.length > 1) variantWords++;
    fresh.set(index, { word: clips });
  });

  const manifest = loadManifest();
  mergeSource(manifest, "ja", "ka", fresh);
  writeManifest(manifest);
  console.log(
    `kanjialive: matched ${matched}/${SEED.ja.length} ja seed words (${variantWords} with 2+ voices)`
  );
}

// ---------------------------------------------------------------- common voice
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

const normDe = (s) =>
  s
    .toLowerCase()
    .replace(/[.!?…,;:"'„“”‚’()\-–—]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
const normJa = (s) => s.replace(/[。！？!?、\s]/g, "");

function runCommonVoice(datasetDir) {
  if (!datasetDir) {
    console.error("usage: npm run gen-audio -- commonvoice <path-to-extracted-dataset-dir>");
    process.exit(1);
  }
  const tsv = path.join(datasetDir, "validated.tsv");
  if (!existsSync(tsv)) {
    console.error(`no validated.tsv in ${datasetDir} — point at the locale dir of an extracted`);
    console.error("Common Voice dataset (the folder containing validated.tsv and clips/).");
    process.exit(1);
  }
  const ffmpeg = findFfmpeg();
  if (!ffmpeg) {
    console.error("ffmpeg is required to transcode Common Voice mp3 clips to opus.");
    console.error("Install it (brew install ffmpeg) or `npm i -D ffmpeg-static`, then re-run.");
    process.exit(1);
  }

  const lines = readFileSync(tsv, "utf8").split("\n");
  const header = lines[0].split("\t");
  const col = (n) => header.indexOf(n);
  const cClient = col("client_id");
  const cPath = col("path");
  const cSentence = col("sentence");
  const cUp = col("up_votes");

  // locale: prefer the tsv's own locale column, fall back to the dir name
  const cLocale = col("locale");
  let lang = path.basename(path.resolve(datasetDir));
  const first = lines[1]?.split("\t");
  if (cLocale >= 0 && first?.[cLocale]) lang = first[cLocale];
  if (lang !== "ja" && lang !== "de") {
    console.error(`dataset locale "${lang}" is not one of ja/de`);
    process.exit(1);
  }

  // transcript → seed match tables
  const norm = lang === "ja" ? normJa : normDe;
  const wordIdx = new Map(); // norm(word/reading) → seedIndex
  const exampleIdx = new Map(); // norm(example)     → seedIndex
  SEED[lang].forEach((e, i) => {
    wordIdx.set(norm(e.word), i);
    if (lang === "ja" && e.reading) wordIdx.set(norm(e.reading), i);
    if (e.example) exampleIdx.set(norm(e.example), i);
  });

  // collect candidate clips (dedupe by speaker so "voices" means voices)
  const wordClips = new Map(); // seedIndex → [{path, client, votes}]
  const sentClips = new Map(); // seedIndex → {path, votes}
  for (const line of lines.slice(1)) {
    if (!line) continue;
    const f = line.split("\t");
    const t = norm(f[cSentence] ?? "");
    if (!t) continue;
    const votes = cUp >= 0 ? Number(f[cUp]) || 0 : 0;
    const wi = wordIdx.get(t);
    if (wi !== undefined) {
      if (!wordClips.has(wi)) wordClips.set(wi, []);
      wordClips.get(wi).push({ path: f[cPath], client: f[cClient], votes });
    }
    const si = exampleIdx.get(t);
    if (si !== undefined) {
      const cur = sentClips.get(si);
      if (!cur || votes > cur.votes) sentClips.set(si, { path: f[cPath], votes });
    }
  }

  const toOpus = (clip) => {
    const src = path.join(datasetDir, "clips", clip);
    if (!existsSync(src)) return null;
    const out = path.join(CACHE, "cv-tmp.opus");
    try {
      execFileSync(
        ffmpeg,
        ["-y", "-v", "error", "-i", src, "-ac", "1", "-c:a", "libopus", "-b:a", "32k", out],
        { stdio: "ignore" }
      );
      const bytes = readFileSync(out);
      return okOpus(bytes) ? bytes : null; // over-budget clips are skipped
    } catch {
      return null;
    }
  };

  mkdirSync(CACHE, { recursive: true });
  const fresh = new Map();
  let words = 0;
  let sentences = 0;
  for (const [index, clips] of wordClips) {
    // best-voted clip per distinct speaker, up to MAX_VOICES
    const bySpeaker = new Map();
    for (const c of clips) {
      const cur = bySpeaker.get(c.client);
      if (!cur || c.votes > cur.votes) bySpeaker.set(c.client, c);
    }
    const picked = [...bySpeaker.values()]
      .sort((a, b) => b.votes - a.votes || a.path.localeCompare(b.path))
      .slice(0, MAX_VOICES);
    const bytes = picked.map(toOpus).filter(Boolean);
    if (bytes.length) {
      fresh.set(index, { word: bytes });
      words++;
    }
  }
  for (const [index, clip] of sentClips) {
    const bytes = toOpus(clip.path);
    if (!bytes) continue;
    const cur = fresh.get(index) ?? { word: [] };
    cur.sentence = bytes;
    fresh.set(index, cur);
    sentences++;
  }

  const manifest = loadManifest();
  mergeSource(manifest, lang, "cv", fresh);
  writeManifest(manifest);
  console.log(`commonvoice(${lang}): ${words} words, ${sentences} example sentences matched`);
}

// ---------------------------------------------------------------- main
const [cmd = "kanjialive", arg] = process.argv.slice(2);
if (cmd === "kanjialive") runKanjiAlive();
else if (cmd === "commonvoice") runCommonVoice(arg);
else {
  console.error(`unknown source "${cmd}" — use kanjialive or commonvoice`);
  process.exit(1);
}
