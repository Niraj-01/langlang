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
- **Phase 8 (done):** depth + breadth upgrade.
  - *More levels:* `data/jlpt_n4.json` (49) + `data/goethe_a2.json` (48) are
    APPENDED onto the seed in `lib/seed.ts` (now a `LEVELS` structure that
    `flatMap`s into `SEED`), so the Path/feed flow N5→N4 and A1→A2 with no
    pointer drift. `seedLevelLabel(lang, i)` gives the per-index level tag on
    new-word cards.
  - *Grammar cards:* new `grammar` FeedItem + `data/grammar_{ja,de}.json`
    (ja particle drills, de der/die/das + case drills). `GrammarCard` is a
    fill-the-＿ card with a why-note; built in `lib/feed.ts` (`buildGrammar`).
  - *Listening cards:* `listen` FeedItem — "which word did you hear?" MC over
    deck cards, audio auto-plays (`ListenCard`, `buildListen`).
  - *Radicals:* `data/radicals.json` (derived from kanji `components`),
    `/radicals` page + `RadicalsViewer`, linked from Kanji; radical→kanji jump
    uses `/kanji?focus=木` (KanjiViewer reads it via `useSearchParams`, so the
    kanji page is now `Suspense`-wrapped).
  - *Pitch accent:* `pitch?` (Tokyo drop position, 0=heiban) on ja entries —
    a CONSERVATIVE ~32-word confident subset only. `PitchAccent` renders the
    mora contour on ja new-word cards.
  - *Better TTS:* `pickVoice` in `lib/audio.ts` now scores voices
    (Google/Neural/named-native up, compact/eSpeak down); `lib/speak.ts`
    delegates to it. No recorded native audio assets (browser TTS only).
  - *Heatmap:* `Heatmap` (12-week contribution grid from `state.log`) on
    `/progress`.
  - *Weekly League:* `/league` + `League` + `lib/league.ts` — Duolingo-style
    XP tiers from real weekly XP (honest solo ladder; no fake rivals). Real
    cross-user standings need the OPTIONAL, NOT-APPLIED
    `supabase/migrations/0002_leaderboard.sql` view (RLS stays owner-only;
    `fetchLeaderboard()` returns null → solo fallback until provisioned).

- **Phase 9 (done):** professional visual pass + content depth.
  - *De-emoji:* every decorative emoji across the app is replaced by a
    monochrome line-icon system — `components/Icon.tsx` (`<Icon name=… />`,
    currentColor stroke SVGs). Pet cosmetics are SVG line-art
    (`components/CosmeticGlyph.tsx`); Path unit nodes show numbers (`label`)
    with a lock/swords/flag icon; league tiers use medal/diamond icons +
    `color`; achievements carry an `icon: IconName`; scenario emoji/avatars
    dropped in favour of a `chat`/`swords` icon. Language chips are text
    (JA/DE), not flags. Monochrome typographic marks (★ ♥ ✓ ⇄ ✦) are kept as
    intentional typography. Wrapped slides use `icon` (the PNG export just
    drops the glyph). If you add UI, use `<Icon>` — do not add emoji.
    **One deliberate exception:** `app/reels-design/page.tsx` (`/reels-design`)
    is a 1:1 copy of the `Reels.dc.html` Claude Design mockup, kept as a visual
    reference. Its emoji are INTENTIONAL and must not be "fixed" — it is not a
    product surface (unlinked from nav, excluded from the offline shell).
  - *Grammar in lessons:* `buildLesson(words, pool, grammar?)` folds up to 2
    fill-the-blank grammar drills into each lesson; `GrammarEx` in
    `components/Lesson.tsx` shows the "why" note via the shared `CheckBar`
    coach on a miss. `onChecked(ok, word?)` — grammar passes no word, so it
    never mints a vocab mistake.
  - *More content:* N4 → 68, A2 → 68 (append-only); confident Tokyo
    pitch-accent subset grown to ~57 N5 words.

- **i+1 sentence cards (done):** real Tatoeba sentences (CC BY 2.0 FR) served
  as feed cards when the learner knows every content word except exactly ONE
  (due card or the current new word). `scripts/gen-sentences.mjs`
  (`npm run gen-sentences`) downloads the per-language Tatoeba exports (cached
  in gitignored `.cache/tatoeba/`), tokenizes ja with kuromoji (devDependency,
  build-time only) and de naively, and keeps only sentences whose every
  content token maps to a seed word → `data/sentences_{ja,de}.json` (~1500
  each, ship in the repo — the review path never fetches). Runtime:
  `lib/sentences.ts` (`qualifying`/`pickSentence`, known = FSRS stability ≥ 7d,
  same bar as Path stars), `buildSentence` in `lib/feed.ts` (~10% weight),
  `SentenceCard` (tap-gloss per word, tap the highlighted unknown → reveal →
  self-grade rates that word's card via `rateCard`; grading the current new
  word `addNewWord`s it first). Attribution lives in Profile → Credits.
  REGENERATE the JSONs after seed changes (seedIndex is positional).
- **Native audio layer (done):** real native-speaker audio for seed words,
  with browser TTS as the UNIVERSAL fallback (never remove it — words without
  clips, old Safari without ogg/opus, and offline-before-first-play all rely
  on it). `scripts/gen-audio.mjs` (`npm run gen-audio`) matches seed entries
  against Kanji Alive example-word audio (CC BY 4.0, zip cached in
  `.cache/audio/`) and — optionally, `commonvoice <local-dataset-dir>`, never
  downloads, needs ffmpeg — Mozilla Common Voice (CC0). Ships small opus clips
  to `public/audio/{lang}/{index}.opus` (voices 2–3 as `{index}.{k}.opus`,
  example sentences as `{index}.s.opus`) + `data/audio_manifest.json`
  (bundled via import; seedIndex-keyed, so REGENERATE-safe only by append).
  Runtime: `lib/nativeAudio.ts` — `play(lang, seedIndex)` / `playWord(text,
  lang)` (drop-in for `speak()`; all feed/lesson 🔊 route through it;
  `VoicePicker` and the Learn-zone reference pages stay raw TTS on purpose).
  SW caches `/audio/` cache-first → replays work offline after first listen.
  Multi-voice: `voiceCount` powers random-variant replays on listen cards and
  the "same word, different voice?" pair mode (`buildListenPair` in
  `lib/feed.ts`, `pair` on the listen FeedItem). ja: 167/206 words covered
  (33 multi-voice, ~1MB total); de stays TTS until a Common Voice run.
  Attribution in Profile → Credits; integrity tests in `tests/audio.test.ts`.
- **Image layer (done, icon tier):** an illustration per seed word,
  absent-by-default (a word without an image renders exactly as before — same
  universal-fallback contract as native audio/TTS). Two-tier source model in
  `scripts/gen-images.mjs` (`npm run gen-images`):
  - *tabler (FREE, default):* `@tabler/icons` outline SVGs (MIT, devDependency)
    matched via `data/word_icons.json` (hand-authored normalized-English-gloss →
    icon-name map, ~410 entries; `lang:index` keys override a gloss; edit map →
    re-run, self-cleaning). Recolored to the language accent, inner margin via
    viewBox, ~0.4KB each → currently ja 306/806 + de 316/805 words (~250KB
    total). Fits the Phase-9 monochrome line-icon design system.
  - *openai / gemini (PAID, explicit `--provider` only):* AI flat illustrations,
    gpt-image-1 (`OPENAI_API_KEY` ≈ $0.011/img) or gemini-3.1-flash-lite-image
    (`GEMINI_API_KEY`, Interactions API `POST /v1beta/interactions` — the 3.x
    image models 404 on generateContent; ≈ $0.034/img, NO Gemini free tier,
    billing required). Most-frequent-first; raw output cached in
    `.cache/images/` (never re-bills); ffmpeg → 512×512 webp ≤ 64KB. AI images
    UPGRADE over tabler entries (same word regenerates, stale svg unlinked).
  Both skip unpicturable pos (particles, articles, …). Output:
  `public/images/{lang}/{index}.webp|svg` + `data/image_manifest.json`
  (seedIndex-keyed, bundled). Runtime: `lib/wordImage.ts`
  (`wordImage`/`wordImageFor`); renders on new-word cards and the review card's
  ANSWER side only (front would leak the meaning). SW caches `/images/`
  cache-first with `/audio/`. Integrity tests `tests/images.test.ts`. Feed
  scroll also gained `snap-always` (one card per swipe, no momentum skips).
  Tabler credit line in Profile → Credits. Future: picture-quiz card ("pick the
  image") — coverage is now real enough.
- **Coverage audit (done):** honest exam coverage against real wordlists.
  `scripts/wordlists/` holds the four lists (tanos.co.uk JLPT N5/N4 CC BY;
  official Goethe A1/A2 Wortliste PDFs extracted by geometry — see the README
  there; replace a CSV + re-run to upgrade a list). `npm run audit`
  (`scripts/audit-coverage.mjs`) diffs them against the seeds (ja matches word
  or kana reading, but reading matches must share a kanji — 飴≠雨; de matches
  case-insensitively, articles live in their own column) and writes
  `scripts/out/missing_{exam}.json` + `data/exam_words_{exam}.json`
  (listWord → seedIndex|null, bundled). `npm run gen-gap-entries` drafts
  REVIEWABLE seed entries for missing words via the Claude API (needs
  `ANTHROPIC_API_KEY`; batch/cache/resume in `scripts/out/gap_{exam}.json`,
  validator enforces VocabEntry shape + tip ≤ 2 sentences + no invented
  pitch) — entries are NEVER auto-appended; review then append manually and
  re-run `npm run audit` + `npm run gen-sentences`. `/progress` bars for
  audited exams compute against the official list size (`EXAM_WORDS` +
  `examCoverage` in `lib/exams.ts`, `examListCoverage` in `lib/derive.ts`;
  faint band = seed coverage, solid fill = mastered). Tests in
  `tests/coverage.test.ts` re-verify every shipped mapping.
- **Gap content pass (done):** the 596 most FREQUENT missing exam words
  (150/exam by corpus rank, A2 minus A1 overlap, N4 minus N5) authored as
  full reviewed entries via the gen-gap-entries pipeline and appended as
  `data/{jlpt_n5,jlpt_n4,goethe_a1,goethe_a2}_gap.json` — NEW LEVELS in
  `lib/seed.ts` LEVELS (labels reuse the exam tag, files pre-sorted by
  freqRank). They sit AFTER the original levels: inserting into an existing
  level would shift every later seedIndex (pointer/audio/sentence corruption),
  so exam-list fills always land in a trailing gap file, and the four scripts'
  seed concatenations (gen-sentences/gen-audio/gen-frequency/audit) list the
  same 4-file order. Four conjugation leaks (hatte/sollte/fühlt/setzt) were
  removed from `scripts/wordlists/goethe_a2.csv` as extraction artifacts.
  Honest coverage after the pass: N5 ~43%, N4 ~33%, A1 ~43%, A2 ~36%;
  ja native audio grew to 306/506 words. Remaining ~1,950 missing words are
  the low-frequency tail — fill via `npm run gen-gap-entries` (API) or more
  authoring passes, same append flow.
- **Gap content pass 2 (done):** the NEXT 599 most-frequent missing words
  (150/exam, 149 for A2) authored the same way and appended as
  `data/{...}_gap2.json` — SEPARATE trailing levels (gap2 must never merge
  into gap, or seedIndexes shift). Each gap PASS is its own level pair in
  `lib/seed.ts` LEVELS; the four scripts list all six files per language in
  the same order. One A2 artifact removed (`trifft`, a conjugation of
  covered `treffen`); three lowercase-artifact nouns (Wunsch/Zahl/Gang)
  authored capitalized. Coverage after pass 2: N5 ~66%, N4 ~57%, A1 ~65%,
  A2 ~60%; seeds now ja 806 / de 805; ja native audio 483/806 words
  (124 multi-voice, ~4.7MB). Remaining tail is lower-frequency; same append
  flow for future passes.
- **Frequency ranking (done):** corpus `freqRank` on every seed entry, written
  IN PLACE by `npm run gen-frequency` (`scripts/gen-frequency.mjs`; ja =
  Leipzig jpn_news 10K CC BY 4.0 — hermitdave's ja list is stem-segmented and
  only matched ~50%; de = hermitdave OpenSubtitles de_50k CC BY-SA 4.0 +
  Leipzig deu fill; caches in `.cache/frequency/`, idempotent, edits the
  one-entry-per-line JSONs surgically so diffs are freqRank-only). ja 195/206,
  de 203/210 ranked. Used two ways: (1) muted "top 500"/"top 2000" tier chips
  (`freqTier` in `lib/seed.ts`) on new-word cards + the lesson end screen;
  (2) new words are dealt most-frequent-first WITHIN each Path unit —
  `DEAL_ORDER`/`dealIndexAt`/`dealPosOf` in `lib/seed.ts`. IMPORTANT semantic
  shift: `newIndex` now counts consumed DEAL POSITIONS (unit-local
  permutation), so it crosses unit/level boundaries exactly as before;
  `bumpNewIndex`, `buildLesson`'s unit deal, and `lib/sentences.ts` all map
  through `dealPosOf`/`dealIndexAt`. `UNIT_SIZE` moved to `lib/seed.ts`
  (path.ts re-exports). FUTURE levels (N3/B1) must be sorted by freqRank
  BEFORE appending (comment in seed.ts). Order-stability snapshot +
  permutation invariants in `tests/frequency.test.ts`.

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
