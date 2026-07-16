// gen-sentences — builds the i+1 sentence pool from Tatoeba exports.
//
//   npm run gen-sentences
//
// Downloads (cached in .cache/tatoeba/, gitignored) the per-language Tatoeba
// exports (sentences + eng links), tokenizes every Japanese/German sentence,
// and keeps only sentences whose EVERY content token maps to a seed-vocab
// entry. Trivial tokens (particles, auxiliaries, punctuation, pronouns,
// numbers, common Tatoeba names) are kept with seedIndex null. That 100%%
// content coverage is what makes the runtime "exactly one unknown word"
// invariant in lib/sentences.ts sound — a sentence with an unmapped content
// word could never qualify, so we drop it here.
//
// Output: data/sentences_ja.json / data/sentences_de.json
//   { id, text, translation, tokens: [{ surface, seedIndex|null, reading? }] }
// `id` is the Tatoeba sentence id (kept for CC BY attribution).
//
// License: Tatoeba sentences are CC BY 2.0 FR (https://tatoeba.org). The app
// shows attribution in Profile → Credits. This script runs at BUILD time only;
// the app never touches the network for sentences (reviews stay offline).

import { spawn, execFileSync } from "node:child_process";
import { createInterface } from "node:readline";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const kuromoji = require("kuromoji");

const ROOT = path.join(import.meta.dirname, "..");
const CACHE = path.join(ROOT, ".cache", "tatoeba");
const BASE = "https://downloads.tatoeba.org/exports/per_language";

const FILES = {
  jpn: `${BASE}/jpn/jpn_sentences.tsv.bz2`,
  deu: `${BASE}/deu/deu_sentences.tsv.bz2`,
  eng: `${BASE}/eng/eng_sentences.tsv.bz2`,
  jpnLinks: `${BASE}/jpn/jpn-eng_links.tsv.bz2`,
  deuLinks: `${BASE}/deu/deu-eng_links.tsv.bz2`,
};

const MAX_SENTENCES = 1500; // per language
const MIN_TOKENS = 3;
const MAX_TOKENS = 12;
const MIN_DISTINCT_SEED = 2; // 1 known + 1 unknown at minimum, or the card is trivial
const PER_WORD_CAP = 30; // variety: don't let one word hog the pool

// ---------------------------------------------------------------- seeds
// Concatenation order MUST match lib/seed.ts LEVELS (append-only contract):
// ja = N5 then N4; de = A1 then A2. seedIndex here IS the runtime newIndex.
const seedJa = [
  ...JSON.parse(readFileSync(path.join(ROOT, "data/jlpt_n5.json"), "utf8")),
  ...JSON.parse(readFileSync(path.join(ROOT, "data/jlpt_n4.json"), "utf8")),
  ...JSON.parse(readFileSync(path.join(ROOT, "data/jlpt_n5_gap.json"), "utf8")),
  ...JSON.parse(readFileSync(path.join(ROOT, "data/jlpt_n4_gap.json"), "utf8")),
  ...JSON.parse(readFileSync(path.join(ROOT, "data/jlpt_n5_gap2.json"), "utf8")),
  ...JSON.parse(readFileSync(path.join(ROOT, "data/jlpt_n4_gap2.json"), "utf8")),
];
const seedDe = [
  ...JSON.parse(readFileSync(path.join(ROOT, "data/goethe_a1.json"), "utf8")),
  ...JSON.parse(readFileSync(path.join(ROOT, "data/goethe_a2.json"), "utf8")),
  ...JSON.parse(readFileSync(path.join(ROOT, "data/goethe_a1_gap.json"), "utf8")),
  ...JSON.parse(readFileSync(path.join(ROOT, "data/goethe_a2_gap.json"), "utf8")),
  ...JSON.parse(readFileSync(path.join(ROOT, "data/goethe_a1_gap2.json"), "utf8")),
  ...JSON.parse(readFileSync(path.join(ROOT, "data/goethe_a2_gap2.json"), "utf8")),
];

// ---------------------------------------------------------------- download
function ensureDownloads() {
  mkdirSync(CACHE, { recursive: true });
  for (const url of Object.values(FILES)) {
    const out = path.join(CACHE, path.basename(url));
    if (existsSync(out)) continue;
    console.log("downloading", path.basename(url));
    execFileSync("curl", ["-sf", "--max-time", "900", "-o", out, url], { stdio: "inherit" });
  }
}

/** Stream a .tsv.bz2 line by line (shells out to bzip2 — build-time only). */
function bzLines(file, onLine) {
  return new Promise((resolve, reject) => {
    const p = spawn("bzip2", ["-dc", path.join(CACHE, path.basename(file))]);
    p.on("error", reject);
    p.stderr.on("data", () => {});
    const rl = createInterface({ input: p.stdout, crlfDelay: Infinity });
    rl.on("line", onLine);
    rl.on("close", resolve);
  });
}

// ---------------------------------------------------------------- japanese
const kataToHira = (s) =>
  s.replace(/[ァ-ヶ]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) - 0x60));

// POS classes that never need to map to vocab (grammar glue, not content)
const JA_TRIVIAL_POS = new Set(["助詞", "助動詞", "記号", "フィラー", "その他"]);
const JA_TRIVIAL_DETAIL = new Set(["数", "非自立", "代名詞", "固有名詞", "接尾"]);

function buildJaMaps() {
  const word = new Map();
  const reading = new Map();
  const readingCollisions = new Set();
  seedJa.forEach((e, i) => {
    if (!word.has(e.word)) word.set(e.word, i);
    if (e.reading) {
      if (reading.has(e.reading)) readingCollisions.add(e.reading);
      else reading.set(e.reading, i);
    }
  });
  for (const r of readingCollisions) reading.delete(r); // ambiguous readings never match
  return { word, reading };
}

function tokenizeJa(tokenizer, maps, text) {
  const raw = tokenizer.tokenize(text);
  const tokens = [];
  for (const t of raw) {
    const surface = t.surface_form;
    if (!surface.trim()) continue;
    const hira = t.reading ? kataToHira(t.reading) : undefined;
    // seed match wins over the trivial classes (私 is a pronoun AND a seed word)
    const basic = t.basic_form && t.basic_form !== "*" ? t.basic_form : surface;
    let idx = maps.word.get(basic) ?? maps.word.get(surface);
    if (idx === undefined && /^[ぁ-ゟァ-ー]+$/.test(surface)) {
      idx = maps.reading.get(kataToHira(surface)) ?? maps.reading.get(surface);
    }
    if (idx !== undefined) {
      tokens.push({ surface, seedIndex: idx, ...(hira && hira !== surface ? { reading: hira } : {}) });
      continue;
    }
    if (JA_TRIVIAL_POS.has(t.pos) || JA_TRIVIAL_DETAIL.has(t.pos_detail_1)) {
      tokens.push({ surface, seedIndex: null });
      continue;
    }
    return null; // unmapped content word → reject sentence
  }
  return tokens;
}

// ---------------------------------------------------------------- german
// Grammar glue + Tatoeba's stock names. Anything that is ALSO a seed word is
// removed from this set below (seed match must win — e.g. "wo", "warum").
const DE_STOPWORDS = new Set([
  "der","die","das","den","dem","des","ein","eine","einen","einem","einer","eines",
  "ich","du","er","sie","es","wir","ihr","mich","dich","ihn","uns","euch","mir","dir","ihm","ihnen","sich",
  "mein","meine","meinen","meinem","meiner","dein","deine","deinen","deinem","deiner",
  "sein","seine","seinen","seinem","seiner","ihre","ihren","ihrem","ihrer","unser","unsere","euer","eure",
  "und","oder","aber","denn","doch","auch","nur","noch","schon","dann","denen","dieser","diese","dieses","diesen","diesem",
  "in","im","an","am","auf","aus","bei","beim","mit","nach","von","vom","zu","zum","zur","für","über","unter","vor","hinter","durch","gegen","ohne","um","bis",
  "dass","weil","wenn","als","ob","wie","was","wer","wen","wem","wessen",
  "ist","sind","bin","bist","seid","war","waren","warst","wart","gewesen","sei",
  "habe","hast","hat","haben","habt","hatte","hatten","hattest","gehabt",
  "werde","wirst","wird","werden","werdet","wurde","wurden","geworden","würde","würden","würdest",
  "kann","kannst","können","könnt","konnte","konnten","könnte","könnten",
  "muss","musst","müssen","müsst","musste","mussten","müsste",
  "will","willst","wollen","wollt","wollte","wollten",
  "soll","sollst","sollen","sollt","sollte","sollten",
  "darf","darfst","dürfen","dürft","durfte","durften",
  "mag","magst","mögen","möchte","möchtest","möchten",
  "ja","nein","nicht","kein","keine","keinen","keinem","keiner","so","da","dort","dorthin","her","hin","mal","etwas","alles","nichts","man","je","pro",
  // stock Tatoeba names — reads as a name, not vocabulary
  "tom","maria","mary","john","jane","ken","yumi","ali","anna","emma","bill","betty","toms","marias",
]);

const DE_IRREGULAR = {
  essen: ["esse", "isst", "esst", "aß", "aßen", "gegessen"],
  sehen: ["sehe", "siehst", "sieht", "seht", "sah", "sahen", "gesehen"],
  lesen: ["lese", "liest", "lest", "las", "lasen", "gelesen"],
  sprechen: ["spreche", "sprichst", "spricht", "sprecht", "sprach", "sprachen", "gesprochen"],
  fahren: ["fahre", "fährst", "fährt", "fahrt", "fuhr", "fuhren", "gefahren"],
  schlafen: ["schlafe", "schläfst", "schläft", "schlaft", "schlief", "schliefen", "geschlafen"],
  treffen: ["treffe", "triffst", "trifft", "trefft", "traf", "trafen", "getroffen"],
  helfen: ["helfe", "hilfst", "hilft", "helft", "half", "halfen", "geholfen"],
  wissen: ["weiß", "weißt", "wisst", "wusste", "wussten", "gewusst"],
  gehen: ["gehe", "gehst", "geht", "ging", "gingen", "gegangen"],
  kommen: ["komme", "kommst", "kommt", "kam", "kamen", "gekommen"],
  trinken: ["trinke", "trinkst", "trinkt", "trank", "tranken", "getrunken"],
  geben: ["gebe", "gibst", "gibt", "gebt", "gab", "gaben", "gegeben"],
  nehmen: ["nehme", "nimmst", "nimmt", "nehmt", "nahm", "nahmen", "genommen"],
  empfehlen: ["empfehle", "empfiehlst", "empfiehlt", "empfahl", "empfohlen"],
};

function deVerbForms(inf) {
  const forms = new Set([inf]);
  const stem = inf.replace(/e?n$/, "");
  for (const end of ["e", "st", "t", "en", "et", "te", "test", "ten", "tet"]) forms.add(stem + end);
  forms.add("ge" + stem + "t");
  for (const f of DE_IRREGULAR[inf] ?? []) forms.add(f);
  return forms;
}

function buildDeMap() {
  const map = new Map();
  const add = (key, i) => {
    const k = key.toLowerCase();
    if (!map.has(k)) map.set(k, i);
  };
  seedDe.forEach((e, i) => {
    if (e.word.includes(" ")) return; // multiword entries can't match single tokens
    add(e.word, i);
    if (e.plural) {
      add(e.plural, i);
      add(e.plural + "n", i); // dative plural
    }
    if (e.pos === "verb") for (const f of deVerbForms(e.word.toLowerCase())) add(f, i);
    if (e.pos === "adjective") {
      for (const end of ["e", "er", "es", "en", "em"]) add(e.word.toLowerCase() + end, i);
    }
  });
  // a seed word always beats the stopword list (wo, warum, viel, …)
  for (const k of map.keys()) DE_STOPWORDS.delete(k);
  return map;
}

function tokenizeDe(map, text) {
  const rawTokens = text.split(/[^A-Za-zÄÖÜäöüß]+/).filter(Boolean);
  if (rawTokens.length === 0) return null;
  const tokens = [];
  for (const surface of rawTokens) {
    const lower = surface.toLowerCase();
    if (DE_STOPWORDS.has(lower) || /^\d+$/.test(surface)) {
      tokens.push({ surface, seedIndex: null });
      continue;
    }
    const idx = map.get(lower);
    if (idx === undefined) return null; // unmapped content word → reject
    tokens.push({ surface, seedIndex: idx });
  }
  return tokens;
}

// ---------------------------------------------------------------- pipeline
async function loadPairs(sentFile, linkFile) {
  const source = new Map(); // id -> text
  await bzLines(sentFile, (line) => {
    const [id, , text] = line.split("\t");
    if (id && text) source.set(id, text);
  });
  const engFor = new Map(); // source id -> eng id (first link wins)
  const needed = new Set();
  await bzLines(linkFile, (line) => {
    const [srcId, engId] = line.split("\t");
    if (srcId && engId && source.has(srcId) && !engFor.has(srcId)) {
      engFor.set(srcId, engId);
      needed.add(engId);
    }
  });
  return { source, engFor, needed };
}

function selectAndCap(candidates) {
  // Progressive pool: sentences built from EARLY-curriculum words first (their
  // highest seedIndex, ascending), so beginners with a 20-word deck still find
  // qualifying i+1 sentences now that the seed list is 500+ words. Within the
  // same frontier, prefer higher coverage then shorter; the greedy per-word
  // cap keeps variety and lets later vocabulary fill the rest of the pool.
  const maxIdx = (c) =>
    Math.max(...c.tokens.filter((t) => t.seedIndex !== null).map((t) => t.seedIndex));
  candidates.sort(
    (a, b) => maxIdx(a) - maxIdx(b) || b.coverage - a.coverage || a.tokens.length - b.tokens.length
  );
  const perWord = new Map();
  const out = [];
  const seenText = new Set();
  for (const c of candidates) {
    if (out.length >= MAX_SENTENCES) break;
    if (seenText.has(c.text)) continue;
    const indices = [...new Set(c.tokens.filter((t) => t.seedIndex !== null).map((t) => t.seedIndex))];
    if (!indices.some((i) => (perWord.get(i) ?? 0) < PER_WORD_CAP)) continue;
    for (const i of indices) perWord.set(i, (perWord.get(i) ?? 0) + 1);
    seenText.add(c.text);
    out.push({ id: c.id, text: c.text, translation: c.translation, tokens: c.tokens });
  }
  return out;
}

function writeOut(file, sentences) {
  const body = sentences.map((s) => JSON.stringify(s)).join(",\n");
  writeFileSync(path.join(ROOT, "data", file), "[\n" + body + "\n]\n");
  console.log(`data/${file}: ${sentences.length} sentences`);
}

async function main() {
  ensureDownloads();

  console.log("loading Japanese + German sentence/link tables…");
  const ja = await loadPairs(FILES.jpn, FILES.jpnLinks);
  const de = await loadPairs(FILES.deu, FILES.deuLinks);

  // stream the (large) English table once, keeping only linked translations
  const eng = new Map();
  const wanted = new Set([...ja.needed, ...de.needed]);
  await bzLines(FILES.eng, (line) => {
    const [id, , text] = line.split("\t");
    if (wanted.has(id)) eng.set(id, text);
  });
  console.log(`sentences: ja=${ja.source.size} de=${de.source.size} eng-translations=${eng.size}`);

  const tokenizer = await new Promise((res, rej) =>
    kuromoji
      .builder({ dicPath: path.join(ROOT, "node_modules/kuromoji/dict") })
      .build((err, t) => (err ? rej(err) : res(t)))
  );
  const jaMaps = buildJaMaps();
  const deMap = buildDeMap();

  const harvest = (pairs, tokenize) => {
    const out = [];
    for (const [id, text] of pairs.source) {
      const engId = pairs.engFor.get(id);
      const translation = engId && eng.get(engId);
      if (!translation) continue;
      const tokens = tokenize(text);
      if (!tokens) continue;
      const nonPunct = tokens.filter((t) => /[\p{L}\p{N}]/u.test(t.surface));
      if (nonPunct.length < MIN_TOKENS || nonPunct.length > MAX_TOKENS) continue;
      const distinct = new Set(tokens.filter((t) => t.seedIndex !== null).map((t) => t.seedIndex));
      if (distinct.size < MIN_DISTINCT_SEED) continue;
      out.push({ id: Number(id), text, translation, tokens, coverage: distinct.size / nonPunct.length });
    }
    return out;
  };

  const jaCandidates = harvest(ja, (t) => {
    if (/[A-Za-z0-9]/.test(t)) return null; // mixed-script sentences tokenize badly
    return tokenizeJa(tokenizer, jaMaps, t);
  });
  const deCandidates = harvest(de, (t) => tokenizeDe(deMap, t));
  console.log(`candidates: ja=${jaCandidates.length} de=${deCandidates.length}`);

  writeOut("sentences_ja.json", selectAndCap(jaCandidates));
  writeOut("sentences_de.json", selectAndCap(deCandidates));
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
