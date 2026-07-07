// Builds data/strokes.json — ordered SVG stroke paths for every character in
// our kana + kanji sets, sourced from the open KanjiVG project (CC BY-SA 3.0,
// https://kanjivg.tagaini.net/). Each entry: { viewBox, paths: [d, d, ...] }
// in correct stroke order. Combos (きゃ) are split into component chars, each
// stored on its own. Run: node scripts/gen-strokes.mjs

import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const dataDir = join(__dirname, "..", "data");
const read = (f) => JSON.parse(readFileSync(join(dataDir, f), "utf8"));

const hira = read("hiragana.json");
const kata = read("katakana.json");
const kanji = read("kanji.json");

// unique single characters (split multi-char kana combos into components)
const chars = new Set();
for (const k of [...hira, ...kata]) for (const c of [...k.char]) chars.add(c);
for (const k of kanji) chars.add(k.kanji);

const RAW = "https://raw.githubusercontent.com/KanjiVG/kanjivg/master/kanji";
const codepoint = (ch) => ch.codePointAt(0).toString(16).padStart(5, "0");

async function fetchStrokes(ch) {
  const url = `${RAW}/${codepoint(ch)}.svg`;
  const res = await fetch(url);
  if (!res.ok) return null;
  const svg = await res.text();
  const vb = svg.match(/viewBox="([^"]+)"/)?.[1] ?? "0 0 109 109";
  const paths = [...svg.matchAll(/<path[^>]*\sd="([^"]+)"/g)].map((m) => m[1]);
  if (paths.length === 0) return null;
  return { viewBox: vb, paths };
}

const list = [...chars];
const out = {};
let ok = 0;
const CONCURRENCY = 8;

for (let i = 0; i < list.length; i += CONCURRENCY) {
  const batch = list.slice(i, i + CONCURRENCY);
  const results = await Promise.all(
    batch.map(async (ch) => [ch, await fetchStrokes(ch).catch(() => null)])
  );
  for (const [ch, data] of results) {
    if (data) {
      out[ch] = data;
      ok++;
    }
  }
  process.stdout.write(`\r${Math.min(i + CONCURRENCY, list.length)}/${list.length} fetched (${ok} ok)`);
}

writeFileSync(join(dataDir, "strokes.json"), JSON.stringify(out));
console.log(`\nwrote strokes.json — ${ok}/${list.length} characters covered`);
const missing = list.filter((c) => !out[c]);
if (missing.length) console.log("missing:", missing.join(" "));
