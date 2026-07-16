// audit-coverage — diffs the seed vocab against official/community exam
// wordlists and reports honest coverage per exam.
//
//   npm run audit
//
// Inputs:  scripts/wordlists/{jlpt_n5,jlpt_n4,goethe_a1,goethe_a2}.csv
//          (sources + formats documented in scripts/wordlists/README.md)
// Outputs: scripts/out/missing_{exam}.json   — list-entries with no seed match
//                                              (input for gen-gap-entries.mjs)
//          data/exam_words_{exam}.json       — { listWord: seedIndex | null },
//                                              shipped so /progress can compute
//                                              coverage against the OFFICIAL
//                                              list size (offline, bundled)
//
// Matching: de — case-insensitive on the word (articles live in their own
// column). ja — exact on the word, then on the kana reading. A reading match
// is only trusted when it can't be a homophone: the list word must be
// kana-only or share a kanji with the seed word (子供/子ども and 終る/終わる
// are the same word spelled differently; 飴/雨 are different words that both
// read あめ). Readings shared by 2+ seeds are never used (かみ problem).

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const ROOT = path.join(import.meta.dirname, "..");
const LISTS = path.join(ROOT, "scripts", "wordlists");
const OUT = path.join(ROOT, "scripts", "out");

// Concatenation order MUST match lib/seed.ts LEVELS (append-only contract):
// the array index here IS the runtime seedIndex.
const SEED = {
  ja: [
    ...JSON.parse(readFileSync(path.join(ROOT, "data/jlpt_n5.json"), "utf8")),
    ...JSON.parse(readFileSync(path.join(ROOT, "data/jlpt_n4.json"), "utf8")),
    ...JSON.parse(readFileSync(path.join(ROOT, "data/jlpt_n5_gap.json"), "utf8")),
    ...JSON.parse(readFileSync(path.join(ROOT, "data/jlpt_n4_gap.json"), "utf8")),
  ],
  de: [
    ...JSON.parse(readFileSync(path.join(ROOT, "data/goethe_a1.json"), "utf8")),
    ...JSON.parse(readFileSync(path.join(ROOT, "data/goethe_a2.json"), "utf8")),
    ...JSON.parse(readFileSync(path.join(ROOT, "data/goethe_a1_gap.json"), "utf8")),
    ...JSON.parse(readFileSync(path.join(ROOT, "data/goethe_a2_gap.json"), "utf8")),
  ],
};

const EXAMS = [
  { exam: "jlpt_n5", lang: "ja" },
  { exam: "jlpt_n4", lang: "ja" },
  { exam: "goethe_a1", lang: "de" },
  { exam: "goethe_a2", lang: "de" },
];

// ---------------------------------------------------------------- csv
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

// ---------------------------------------------------------------- normalize
const normJa = (s) => s.replace(/[・〜～\s]/g, "");
const normDe = (s) => s.toLowerCase().replace(/\s+/g, " ").trim();

/** All keys a ja list word may match under (word, minus-suru base). */
function jaKeys(word) {
  const w = normJa(word);
  const keys = [w];
  if (w.endsWith("する") && w.length > 2) keys.push(w.slice(0, -2));
  return keys;
}

// ---------------------------------------------------------------- seed index
function seedTables(lang) {
  const byWord = new Map();
  const byReading = new Map(); // reading -> seedIndex, or -1 when ambiguous
  SEED[lang].forEach((e, i) => {
    if (lang === "ja") {
      const w = normJa(e.word);
      if (!byWord.has(w)) byWord.set(w, i);
      if (e.reading) {
        const r = normJa(e.reading);
        byReading.set(r, byReading.has(r) ? -1 : i);
      }
    } else {
      const w = normDe(e.word);
      if (!byWord.has(w)) byWord.set(w, i);
    }
  });
  return { byWord, byReading };
}

// ---------------------------------------------------------------- audit
mkdirSync(OUT, { recursive: true });
const table = [];

for (const { exam, lang } of EXAMS) {
  const csvPath = path.join(LISTS, `${exam}.csv`);
  if (!existsSync(csvPath)) {
    console.error(`missing wordlist ${csvPath} — see scripts/wordlists/README.md`);
    process.exit(1);
  }
  const [header, ...rows] = parseCsv(readFileSync(csvPath, "utf8")).filter((r) => r.length > 1);
  const col = Object.fromEntries(header.map((h, i) => [h, i]));
  const { byWord, byReading } = seedTables(lang);

  const words = {}; // listWord -> seedIndex | null (insertion order = list order)
  const missing = [];
  const seen = new Set();
  for (const r of rows) {
    const word = r[col.word]?.trim();
    if (!word) continue;
    const dedupeKey = lang === "ja" ? normJa(word) : normDe(word);
    if (seen.has(dedupeKey)) continue;
    seen.add(dedupeKey);

    let idx = null;
    if (lang === "ja") {
      const reading = (r[col.reading] ?? "").trim();
      for (const k of jaKeys(word)) {
        idx = byWord.get(k) ?? null;
        if (idx !== null) break;
      }
      if (idx === null) {
        for (const k of [reading, word]) {
          const hit = k ? byReading.get(normJa(k)) : undefined;
          if (hit === undefined || hit === -1) continue;
          const kanji = [...normJa(word)].filter((c) => /[一-鿿]/.test(c));
          const seedWord = SEED.ja[hit].word;
          const variant = kanji.length === 0 || kanji.some((c) => seedWord.includes(c));
          if (variant) {
            idx = hit;
            break;
          }
        }
      }
      if (idx === null) missing.push({ word, reading: reading || undefined, meaning: r[col.meaning] });
    } else {
      idx = byWord.get(normDe(word)) ?? null;
      if (idx === null)
        missing.push({ word, article: r[col.article] || undefined, raw: r[col.raw] });
    }
    words[word] = idx;
  }

  const total = Object.keys(words).length;
  const covered = total - missing.length;
  table.push({ exam, official: total, covered, pct: ((covered / total) * 100).toFixed(1) + "%", missing: missing.length });

  writeFileSync(path.join(OUT, `missing_${exam}.json`), JSON.stringify(missing, null, 1) + "\n");
  writeFileSync(
    path.join(ROOT, "data", `exam_words_${exam}.json`),
    JSON.stringify(words, null, 0) + "\n"
  );
}

console.table(table);
console.log("wrote scripts/out/missing_*.json + data/exam_words_*.json");
