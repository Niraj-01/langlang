// gen-frequency — writes corpus frequency ranks into the seed JSONs IN PLACE.
//
//   npm run gen-frequency
//
// Adds `"freqRank": <number|null>` to every seed entry. Adding a field is safe
// under the append-only contract; this script NEVER reorders or removes
// entries (it edits each line of the one-entry-per-line JSON files surgically,
// so a git diff shows nothing but freqRank). Re-runs are idempotent.
//
// Sources (cached in .cache/frequency/, gitignored):
//   de — hermitdave/FrequencyWords OpenSubtitles 2018 de_50k (CC BY-SA 4.0),
//        subtitle-derived = colloquial, learner-relevant. Words it misses are
//        filled from the Leipzig Corpora deu_news 10K list (CC BY 4.0).
//   ja — Leipzig Corpora jpn_news 10K list (CC BY 4.0). The hermitdave ja list
//        is segmented down to bare stems (言, 行) and matches only ~50% of the
//        seeds, so the spec's Leipzig fallback is the primary here (95%).
//
// freqRank is used for the "top 500 / top 2000" tier chips and for ordering
// new words WITHIN a Path unit (lib/seed.ts DEAL_ORDER). Ranks from the two de
// sources aren't strictly comparable (different corpora) — the Leipzig fill
// only kicks in for words absent from the 50k subtitle list, which are rare
// enough that the tier chips and within-unit ordering stay meaningful.

import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const ROOT = path.join(import.meta.dirname, "..");
const CACHE = path.join(ROOT, ".cache", "frequency");

const SOURCES = {
  de50k:
    "https://raw.githubusercontent.com/hermitdave/FrequencyWords/master/content/2018/de/de_50k.txt",
  deuLeipzig: "https://downloads.wortschatz-leipzig.de/corpora/deu_news_2023_10K.tar.gz",
  jpnLeipzig: "https://downloads.wortschatz-leipzig.de/corpora/jpn_news_2011_10K.tar.gz",
};

const SEED_FILES = {
  ja: ["data/jlpt_n5.json", "data/jlpt_n4.json"],
  de: ["data/goethe_a1.json", "data/goethe_a2.json"],
};

// ---------------------------------------------------------------- download
function fetchCached(url) {
  mkdirSync(CACHE, { recursive: true });
  const out = path.join(CACHE, path.basename(url));
  if (!existsSync(out)) {
    console.log("downloading", path.basename(url));
    execFileSync("curl", ["-sfL", "--max-time", "300", "-o", out, url], { stdio: "inherit" });
  }
  return out;
}

/** Leipzig *-words.txt (id \t word \t freq) → [word, freq][] sorted by freq desc. */
function leipzigWords(tarball) {
  const tar = fetchCached(tarball);
  const dir = tar.replace(/\.tar\.gz$/, "");
  if (!existsSync(dir)) execFileSync("tar", ["xzf", tar, "-C", CACHE]);
  const wordsFile = path.join(dir, `${path.basename(dir)}-words.txt`);
  return readFileSync(wordsFile, "utf8")
    .trim()
    .split("\n")
    .map((l) => l.split("\t"))
    .filter((r) => r.length >= 3)
    .map((r) => [r[1], Number(r[2])])
    .sort((a, b) => b[1] - a[1]);
}

/** word → rank (1-based; first/highest occurrence wins). */
function rankMap(words) {
  const m = new Map();
  let rank = 0;
  for (const w of words) {
    rank++;
    if (!m.has(w)) m.set(w, rank);
  }
  return m;
}

// ---------------------------------------------------------------- rank tables
const WORD_DE = /^[a-zäöüß-]+$/i;
const HAS_JA = /[぀-ヿ一-鿿]/; // kana or kanji — drops punctuation/latin/digit tokens

function buildDe() {
  const subs = readFileSync(fetchCached(SOURCES.de50k), "utf8")
    .trim()
    .split("\n")
    .map((l) => l.split(" ")[0])
    .filter((w) => WORD_DE.test(w));
  const primary = rankMap(subs.map((w) => w.toLowerCase()));
  const fill = rankMap(
    leipzigWords(SOURCES.deuLeipzig)
      .map(([w]) => w)
      .filter((w) => WORD_DE.test(w))
      .map((w) => w.toLowerCase())
  );
  return (entry) => {
    const key = entry.word.toLowerCase();
    return primary.get(key) ?? fill.get(key) ?? null;
  };
}

function buildJa() {
  const ranks = rankMap(
    leipzigWords(SOURCES.jpnLeipzig)
      .map(([w]) => w)
      .filter((w) => HAS_JA.test(w))
  );
  return (entry) => {
    const keys = [
      entry.word,
      entry.word.replace(/する$/, ""),
      entry.reading,
      entry.reading?.replace(/する$/, ""),
    ].filter(Boolean);
    for (const k of keys) {
      const r = ranks.get(k);
      if (r !== undefined) return r;
    }
    return null;
  };
}

// ---------------------------------------------------------------- in-place write
/** Insert/replace `"freqRank":n` on one compact JSON-object line. */
function withRank(line, rank) {
  const stripped = line.replace(/,"freqRank":(\d+|null)/, "");
  return stripped.replace(/}(,?)\s*$/, `,"freqRank":${rank}}$1`);
}

for (const [lang, files] of Object.entries(SEED_FILES)) {
  const rankOf = lang === "ja" ? buildJa() : buildDe();
  let matched = 0;
  let total = 0;
  let top500 = 0;
  for (const rel of files) {
    const file = path.join(ROOT, rel);
    const lines = readFileSync(file, "utf8").split("\n");
    const out = lines.map((line) => {
      if (!line.trim().startsWith("{")) return line; // array brackets / blank
      const entry = JSON.parse(line.replace(/,\s*$/, ""));
      const rank = rankOf(entry);
      total++;
      if (rank !== null) matched++;
      if (rank !== null && rank <= 500) top500++;
      return withRank(line, rank);
    });
    writeFileSync(file, out.join("\n"));
  }
  console.log(
    `${lang}: freqRank on ${matched}/${total} entries (${top500} in top 500)`
  );
}
console.log("re-run is idempotent; seed ORDER untouched (append-only contract intact)");
