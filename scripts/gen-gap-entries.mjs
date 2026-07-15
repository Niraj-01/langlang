// gen-gap-entries — drafts complete seed entries for exam-list words we don't
// cover yet, for HUMAN REVIEW. Never touches data/*.json seeds: you review
// scripts/out/gap_{exam}.json and append what you accept (append-only rule).
//
//   npm run audit                              # first: writes missing_{exam}.json
//   npm run gen-gap-entries                    # all exams, resumable
//   npm run gen-gap-entries -- --exam jlpt_n5 --limit 24   # a reviewable slice
//
// Uses the same Claude setup as the app's API routes (ANTHROPIC_API_KEY in
// .env.local, model pinned to claude-sonnet-4-6, override via LANGLANG_MODEL).
// Batches ~10 words per request; each batch is cached to scripts/out/ as soon
// as it lands, so re-runs skip everything already generated. Entries failing
// validation (shape, missing article/plural on de nouns, tip > 2 sentences,
// invented pitch, …) go to gap_{exam}.rejected.json with the reason.

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const Anthropic = require("@anthropic-ai/sdk").default ?? require("@anthropic-ai/sdk");

const ROOT = path.join(import.meta.dirname, "..");
const OUT = path.join(ROOT, "scripts", "out");

// mirror lib/claude.ts (that module is TS + Next-coupled, scripts stay plain node)
const MODEL = process.env.LANGLANG_MODEL ?? "claude-sonnet-4-6";
const ALWAYS_THINKS = /^claude-(fable|mythos)/.test(MODEL);
const think = (mode) =>
  mode === "adaptive"
    ? { thinking: { type: "adaptive" } }
    : ALWAYS_THINKS
      ? {}
      : { thinking: { type: "disabled" } };

// .env.local isn't auto-loaded outside Next — read the key from it if present
if (!process.env.ANTHROPIC_API_KEY) {
  const envFile = path.join(ROOT, ".env.local");
  if (existsSync(envFile)) {
    const m = readFileSync(envFile, "utf8").match(/^ANTHROPIC_API_KEY=(.+)$/m);
    if (m) process.env.ANTHROPIC_API_KEY = m[1].trim();
  }
}

const EXAMS = {
  jlpt_n5: "ja",
  jlpt_n4: "ja",
  goethe_a1: "de",
  goethe_a2: "de",
};

// ---------------------------------------------------------------- args
const args = process.argv.slice(2);
const flag = (name) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : undefined;
};
const onlyExam = flag("exam");
const limit = Number(flag("limit") ?? Infinity);
const BATCH = Number(flag("batch") ?? 10);

// ---------------------------------------------------------------- validation
const KANA = /^[ぁ-ゖァ-ヺー・\s]+$/;
const sentences = (s) => (s.match(/[.!?。！？](\s|$)/g) ?? []).length || 1;

/** Validate one generated entry. Returns null if OK, else the reason. */
export function invalidReason(e, lang) {
  if (!e || typeof e !== "object") return "not an object";
  for (const k of ["word", "meaning", "pos", "example", "exampleMeaning"]) {
    if (typeof e[k] !== "string" || !e[k].trim()) return `missing ${k}`;
  }
  if ("pitch" in e) return "pitch must be omitted (no invented pitch values)";
  if (e.tip !== undefined) {
    if (typeof e.tip !== "string") return "tip not a string";
    if (sentences(e.tip) > 2) return "tip longer than 2 sentences";
    if (e.tip.length > 220) return "tip too long";
  }
  if (e.mnemonic !== undefined) return "mnemonic is reserved for the kanji modal";
  if (lang === "ja") {
    if (typeof e.reading !== "string" || !KANA.test(e.reading)) return "reading missing/not kana";
    if (typeof e.exampleReading !== "string" || !e.exampleReading.trim())
      return "exampleReading missing";
    if (/[a-zA-Z]/.test(e.example)) return "example contains romaji";
    if (!e.example.includes(e.word) && !e.example.includes(e.reading))
      return "example does not use the word";
    if (e.example.length > 30) return "example too long (keep it SHORT)";
    if ("article" in e || "plural" in e) return "ja entry with de-only fields";
  } else {
    if (e.pos === "noun") {
      if (!["der", "die", "das"].includes(e.article)) return "de noun without article";
      if (typeof e.plural !== "string" || !e.plural.trim()) return "de noun without plural";
      if (e.word[0] !== e.word[0].toUpperCase()) return "de noun not capitalized";
    } else if (e.article !== undefined || e.plural !== undefined) {
      return "article/plural on a non-noun";
    }
    if ("reading" in e || "exampleReading" in e) return "de entry with ja-only fields";
    if (e.example.length > 90) return "example too long (keep it SHORT)";
    if (!e.example.toLowerCase().includes(e.word.toLowerCase().replace(/-$/, "").split(" ")[0].slice(0, 5)))
      return "example does not appear to use the word";
  }
  if (e.meaning.length > 80) return "meaning too long";
  return null;
}

// ---------------------------------------------------------------- prompts
const SYSTEM = {
  ja: `You write seed vocabulary entries for a Japanese learning app (JLPT track).
Return ONLY a JSON array, one object per requested word, schema:
{"word","reading","meaning","pos","example","exampleReading","exampleMeaning","tip"?}
Rules:
- reading: kana only (hiragana; katakana loanwords keep katakana).
- meaning: short English gloss, no romaji, lowercase unless a proper noun.
- pos: one of noun/verb/i-adjective/na-adjective/adverb/particle/expression/counter/conjunction/pronoun/prenominal.
- example: ONE short natural sentence (≤ ~20 characters) that uses the word; exampleReading: the same sentence fully in kana; exampleMeaning: its English translation.
- tip: ONLY when there is a real nuance (irregular form, transitivity pair, politeness register, common learner confusion). Max 2 sentences. Omit otherwise.
- NEVER include a pitch field. No romaji anywhere (use Hepburn only if romanization is unavoidable inside a tip).`,
  de: `You write seed vocabulary entries for a German learning app (Goethe track).
Return ONLY a JSON array, one object per requested word, schema:
{"word","article"?,"plural"?,"meaning","pos","example","exampleMeaning","tip"?}
Rules:
- Nouns: capitalized word, article (der/die/das) and plural REQUIRED (plural as the full form, e.g. "Häuser", or "—" if unusual/none; use the given article when supplied).
- meaning: short English gloss.
- pos: one of noun/verb/adjective/adverb/preposition/conjunction/pronoun/expression/numeral/particle.
- example: ONE short natural sentence (≤ ~10 words) that uses the word; exampleMeaning: its English translation.
- tip: ONLY when there is a real nuance (separable verb, irregular present, false friend, case government, sein-perfect). Max 2 sentences. Omit otherwise.
- No reading/exampleReading fields (those are Japanese-only).`,
};

function batchPrompt(lang, rows) {
  const items = rows.map((r) => {
    if (lang === "ja") return { word: r.word, reading: r.reading, meaningHint: r.meaning };
    return { word: r.word, article: r.article };
  });
  return `Words to cover (use the exact "word" value; hints come from the exam wordlist and may be terse):
${JSON.stringify(items, null, 1)}`;
}

// ---------------------------------------------------------------- generate
function extractJson(text) {
  const start = text.indexOf("[");
  const end = text.lastIndexOf("]");
  if (start < 0 || end <= start) throw new Error("no JSON array in response");
  return JSON.parse(text.slice(start, end + 1));
}

async function run() {
  const client = new Anthropic();
  const exams = onlyExam ? { [onlyExam]: EXAMS[onlyExam] } : EXAMS;
  if (onlyExam && !EXAMS[onlyExam]) {
    console.error(`unknown exam "${onlyExam}" — one of ${Object.keys(EXAMS).join(", ")}`);
    process.exit(1);
  }

  for (const [exam, lang] of Object.entries(exams)) {
    const missingFile = path.join(OUT, `missing_${exam}.json`);
    if (!existsSync(missingFile)) {
      console.error(`no ${missingFile} — run \`npm run audit\` first`);
      process.exit(1);
    }
    const gapFile = path.join(OUT, `gap_${exam}.json`);
    const rejFile = path.join(OUT, `gap_${exam}.rejected.json`);
    const accepted = existsSync(gapFile) ? JSON.parse(readFileSync(gapFile, "utf8")) : [];
    const rejected = existsSync(rejFile) ? JSON.parse(readFileSync(rejFile, "utf8")) : [];
    const done = new Set([...accepted.map((e) => e.word), ...rejected.map((r) => r.entry?.word)]);

    const missing = JSON.parse(readFileSync(missingFile, "utf8")).filter((r) => !done.has(r.word));
    const todo = missing.slice(0, Math.max(0, limit - 0));
    if (todo.length === 0) {
      console.log(`${exam}: nothing to do (${accepted.length} cached)`);
      continue;
    }
    console.log(`${exam}: generating ${todo.length} of ${missing.length} missing (${accepted.length} cached)`);

    for (let i = 0; i < todo.length; i += BATCH) {
      const rows = todo.slice(i, i + BATCH);
      const res = await client.messages.create({
        model: MODEL,
        max_tokens: 4000,
        ...think("off"),
        system: SYSTEM[lang],
        messages: [{ role: "user", content: batchPrompt(lang, rows) }],
      });
      const text = res.content.find((b) => b.type === "text")?.text ?? "";
      let entries;
      try {
        entries = extractJson(text);
      } catch (err) {
        console.error(`  batch ${i / BATCH + 1}: unparseable response (${err.message}) — skipping`);
        continue;
      }
      const wanted = new Set(rows.map((r) => r.word));
      for (const e of entries) {
        const reason = !wanted.has(e?.word)
          ? `unrequested word "${e?.word}"`
          : invalidReason(e, lang);
        if (reason) rejected.push({ reason, entry: e });
        else accepted.push(e);
      }
      // flush after every batch — the run is resumable at word granularity
      writeFileSync(gapFile, JSON.stringify(accepted, null, 1) + "\n");
      writeFileSync(rejFile, JSON.stringify(rejected, null, 1) + "\n");
      process.stdout.write(`  ${Math.min(i + BATCH, todo.length)}/${todo.length}\r`);
    }
    console.log(`\n${exam}: ${accepted.length} accepted, ${rejected.length} rejected → ${path.relative(ROOT, gapFile)}`);
  }
  console.log("\nReview the gap_*.json files, then append accepted entries to data/ manually");
  console.log("(append-only!) and re-run `npm run audit` + `npm run gen-sentences`.");
}

// Only act when run as a script — tests import invalidReason() from here.
const isMain =
  process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href;

// `--validate-only` re-checks cached output without any API calls (used in tests/CI)
if (isMain && args.includes("--validate-only")) {
  let bad = 0;
  for (const [exam, lang] of Object.entries(EXAMS)) {
    const gapFile = path.join(OUT, `gap_${exam}.json`);
    if (!existsSync(gapFile)) continue;
    for (const e of JSON.parse(readFileSync(gapFile, "utf8"))) {
      const reason = invalidReason(e, lang);
      if (reason) {
        console.error(`${exam}: "${e.word}" — ${reason}`);
        bad++;
      }
    }
  }
  console.log(bad === 0 ? "all cached gap entries valid" : `${bad} invalid entries`);
  process.exit(bad === 0 ? 0 : 1);
} else if (isMain) {
  run().catch((err) => {
    console.error(err.status === 401 || /api.?key|auth/i.test(String(err.message))
      ? "Claude API auth failed — set ANTHROPIC_API_KEY in .env.local (see .env.local.example)."
      : err);
    process.exit(1);
  });
}
