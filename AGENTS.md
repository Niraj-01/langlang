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
  Supabase auth/sync deliberately deferred at the time — now shipped, see Phase 6.
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
- **Phase 5 (done):** marketing landing page at `/` (`components/Landing.tsx`;
  the home dashboard moved to `/learn`), motion pass across inner pages (shared
  `.rise`/`.stagger`/`.tile`/`.tile-soft`/`.press`/`.bar-anim` utilities in
  `globals.css`), and The Path (`/path`) — Duolingo-style unit roadmap derived in
  `lib/path.ts` from `newIndex` (units of 8 seed words, boss checkpoints every
  4 units, mastery stars from FSRS stability ≥ 7d) plus streak features
  (`StreakPanel.tsx`: 7-day strip, freezes, milestone bar; also in Profile).
- **Phase 6 (done):** Supabase backend — Google login + cross-device progress
  sync. Project `ujbegotujvkyicbodacc` (ap-southeast-2), single `user_state`
  table (user_id PK → auth.users, `state` jsonb, RLS owner-only). Client:
  `lib/supabase.ts` (null without `NEXT_PUBLIC_SUPABASE_URL/_ANON_KEY` — app
  stays local-only), `lib/sync.ts` (pull on login, conflict = higher-XP save
  wins, debounced push on store changes; started by `SyncBoot` in the root
  layout), `AuthButton.tsx` (chip on landing header, panel in Profile).
  Sync is layered ON TOP of localStorage — the review path still never
  touches the network. Google provider must be enabled in the Supabase
  dashboard (needs Google OAuth client ID/secret).
- **Phase 7 (done):** Duolingo/Kanji-Study parity — lessons (`/lesson`,
  `lib/lesson.ts` + `components/Lesson.tsx`: 5 hearts, MC / reverse-MC /
  type-the-meaning / match-pairs, end screen with XP·accuracy·time;
  `?unit=N` deals that Path unit into the deck on clear, `?mode=mistakes`
  rehab, `?mode=review` weakest-stability cards), mistakes inbox
  (`/mistakes`, `mistakeLog` in store fed by lesson misses + failed feed
  reviews), favorites (`favorites` in store, hearts on kanji modal +
  phrases, `/saved` in the Learn zone), daily XP goal (`dailyGoal`,
  10/20/50 picker in Profile), derived achievements (`lib/achievements.ts`,
  badge grid in Profile), JLPT chip on kanji. Also fixed a signed-shift
  bug in `dailyQuests` that minted "undefined" quest targets on dates
  whose hash had the high bit set (self-heals on rollover).
- **Content pass (done):** pedagogy upgrade modeled on WaniKani/Tofugu (ja)
  and DW Nicos Weg (de). `data/kanji.json` carries `components` + `mnemonic`
  (WaniKani-style stories, shown in the kanji modal's "remember it" block);
  both vocab seeds carry optional `tip` (usage nuance / grammar notes —
  irregular present forms, separable verbs, が-taking verbs, etc.) and grew
  to 138 (ja) / 142 (de) entries. New seed words are APPEND-ONLY so users'
  `newIndex` stays valid. Tips/mnemonics render on new-word cards and review
  reveals, and are copied onto cards in `entryToCard`. `/lesson` also shows
  the tip (💡, `coach` prop on `CheckBar`) inside the "Not quite" banner after
  a wrong answer — `LessonWord` carries `tip`/`mnemonic`, threaded from the
  unit seed, from card fields (review mode), or looked up in SEED by word
  (mistake mode). Max 2 sentences per tip (hard rule).

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

## Learn zone — beginner Japanese reference (merged in)

A calm, beginner-first Japanese reference lives alongside the feed under the
`app/(reference)/` route group (its own `layout.tsx` renders the bottom `Nav` +
a "← langlang feed" link; scoped so the feed keeps its full-screen chrome).

- Routes: `/hiragana`, `/katakana`, `/kanji`, `/phrases`, `/draw`, `/translate`.
  Entry point: Profile → Modes → "📖 Learn JP".
- Data (local JSON in `data/`): `hiragana.json`, `katakana.json` (104 each: 46
  basic / 25 dakuten+handakuten / 33 yōon, Hepburn + macrons), `kanji.json` (101
  JLPT N5, on'yomi katakana / kun'yomi hiragana / strokes / categories),
  `phrases.json` (65, categorized, pronunciation hints), `strokes.json` (KanjiVG
  stroke paths, CC BY-SA 3.0). Kana + strokes are generated by `scripts/gen-kana.mjs`
  and `scripts/gen-strokes.mjs`.
- Feature highlight: **stroke-order animation** (`components/StrokeOrder.tsx`) plays
  strokes in order with numbered starts; shown on the Draw board.
- `/api/translate` reuses `lib/claude.ts` (`LANGLANG_MODEL`). Reference components:
  `KanaViewer`, `KanjiViewer`, `Phrases`, `Translate`, `DrawBoard`, `StrokeOrder`,
  `Nav`, `Modal`, `PageHeader`; helpers `lib/speak.ts` (ja-JP TTS), `lib/useMounted.ts`.
- Design system for this zone is documented in `CONTEXT.md`; backlog in
  `FUTURE-IMPLEMENTATION.md`. It uses the calmer `--color-surface/muted/accent/accent2`
  + `--font-ui` (Inter) + `.jp`/`.romaji` tokens (added to `globals.css`), distinct
  from the feed's arcade-brutalism.
