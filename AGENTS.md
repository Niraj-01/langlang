<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# langlang

Addictive dual-language learning app (Japanese ja / German de) — JLPT + Goethe tracks.
Core principle: **the feed IS the app.** No study-mode menu; everything (reviews, new
words, quizzes) is a card in one infinite vertical snap feed ("the Doomscroll").

## Status

- **Phase 1 (done):** FSRS v5 engine, Doomscroll feed (review / new-word / quiz /
  status cards), XP + combo + streak, local-first store, JLPT N5 + Goethe A1 seeds.
- **Phase 2 (done):** speak cards (STT shadowing, offline Levenshtein scoring in
  `lib/similarity.ts`, optional Claude one-liner via `/api/speak`), AI Conversation
  Dojo (`/dojo`, scenarios in `data/scenarios.ts`, turns via `/api/dojo`, post-session
  debrief via `/api/dojo/report`), mistake→card pipeline (`addMistakeCard` in store).
  Supabase auth/sync deliberately deferred — still single-user local-first.
- **Phase 3 (done):** daily quests (`lib/quests.ts` deterministic per-day pool, progress
  bumped from store actions, each cleared quest mints a card pack), card packs with
  variable rewards (`openPack` — golden-rich vocab pulls + chance of a pet cosmetic,
  `PackOpen.tsx` rip→reveal animation), the pet (`Pet.tsx` procedural SVG: 5 XP stages,
  mood from streak, wearable cosmetics; lives in the HUD chip + Profile), meme cards
  (`MemeCard.tsx` + `/api/meme`, local brainrot template instantly, Claude swap when
  reachable, cached per word), menace-mode notifications (`/api/notify` + `lib/notify.ts`,
  opt-in, Notifications API when granted, local roast fallback). Profile page at `/profile`.
- **Phase 4:** sentence mining inbox, Focus Mode, boss battles, test tracker,
  Weekly Wrapped, PWA offline reviews.

## Architecture

- `lib/fsrs.ts` — FSRS v5 scheduler (19 default weights, desired retention 0.9).
- `lib/store.ts` — local-first store: localStorage + `useSyncExternalStore`. No
  network anywhere in the review path (hard guardrail). `dueCards` includes
  phase-"new" cards so just-added words are immediately reviewable.
- `lib/feed.ts` — weighted queue: ~45% due reviews / 25% new / 25% quiz / 5% status.
  Rules: max 2 reviews in a row; after a fail the next card must be an easy win;
  quizzes have a 12% double-XP variable reward.
- `components/Feed.tsx` — scroll-snap 100dvh sections, lazy lookahead of 3 items,
  auto-advance ~750ms after an answer.
- `data/*.json` — seed vocab. German nouns always carry `article` + `plural`.

## Hard rules (from the spec)

- German articles are color-coded everywhere: der=blue, die=red, das=green
  (`components/Lex.tsx`).
- All Japanese honors the furigana toggle (あ chip in HUD).
- Explanations in-app: max 2 sentences.
- Correct answers must produce sound + haptic + motion within 100ms (`lib/audio.ts`,
  `lib/confetti.ts` — synthesized WebAudio, no asset files).
- Design: "arcade brutalism" — dark base `#0b0b10`, accent per language
  (ja `#ff3b1f`, de `#d8f000` via `.lang-ja`/`.lang-de` → `--accent`), Archivo Black
  display + Source Sans 3 body + Noto Sans JP.

## Claude API (phase 2)

- Model: `claude-sonnet-4-6` (spec-pinned), override with `LANGLANG_MODEL`. Client in
  `lib/claude.ts`; needs `ANTHROPIC_API_KEY` in `.env.local` (see `.env.local.example`).
- Every AI feature degrades gracefully without a key: speak cards score locally,
  meme cards use a local template, menace mode uses local roasts, Dojo shows a setup
  hint (`no_api_key` 503). Never let the feed depend on the network.
- Web Speech STT wrapper in `lib/speech.ts` — always feature-detect; text input is the
  fallback everywhere (`sttAvailable()`).

## Dev

- `npm run dev` (Next 16 / Turbopack; falls back to :3001 if :3000 busy), `npm run build`.
- Browser-verify: Playwright is a devDependency; drive the feed headlessly at
  viewport 390×844 (click ADD TO DECK / flip+grade / tap a quiz option, then check
  `localStorage["langlang.v1"]`).
