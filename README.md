# langlang

An addictive dual-language learning app (Japanese 🇯🇵 / German 🇩🇪) built around
real acquisition science — FSRS spaced repetition, comprehensible input, and
speaking-first practice — wrapped in TikTok-grade engagement mechanics.

**Live:** https://langlang-ashen.vercel.app

> Core principle: **the feed IS the app.** No menu of study modes — reviews,
> new words, quizzes, speaking, and memes all flow through one infinite vertical
> feed (the "Doomscroll"). Learning happens because stopping feels harder than
> continuing.

## Features

- **The Doomscroll** — full-screen snap feed of review / new-word / quiz / speak /
  meme / status cards. Correct answers fire sound + haptic + confetti within 100ms.
- **FSRS v5** spaced repetition engine (`lib/fsrs.ts`), reviews disguised as content.
- **Speak cards** — shadow a sentence; Web Speech STT + offline Levenshtein scoring,
  with an optional one-line Claude coaching note.
- **AI Conversation Dojo** (`/dojo`) — roleplay scenarios at your level; corrections
  come *after* the session, and every mistake becomes an FSRS card.
- **Boss battles** (`/boss`) — survive N on-target exchanges (no English) to drain a
  boss's health and unlock the next; playable offline.
- **Sentence Mining Inbox** (`/mine`) — paste any real sentence, get furigana / glosses /
  grammar, one-tap add the unknown words.
- **Focus Mode** (`/focus`) — passive audio drill over a procedural visual loop.
- **Test tracker** (`/progress`) — JLPT/Goethe target, FSRS-mastery coverage bars, and a
  pace forecast ("N4-ready by 8 Mar 2027").
- **Weekly Wrapped** (`/wrapped`) — Spotify-Wrapped-style story with 1080×1920 share export.
- **Addiction layer** — daily quests, card packs with variable rewards, an evolving SVG
  pet, meme cards, and opt-in "menace-mode" roast notifications.
- **Local-first + PWA** — all progress lives in `localStorage`; installable and works
  offline (the review path never touches the network).

## Tech

Next.js 16 (App Router) · TypeScript · Tailwind v4 · Framer Motion · Web Speech API ·
Anthropic SDK · synthesized WebAudio/canvas (no asset files) · deployed on Vercel.

## Local development

```bash
npm install
npm run dev        # http://localhost:3000 (falls back to :3001 if busy)
```

The feed, SRS, quizzes, memes, and boss battles work with **no setup**. The
Claude-powered features (Dojo, sentence mining, meme text, roasts, speak coaching)
need an API key — see below.

## Claude API key (optional but recommended)

Every AI feature degrades gracefully without a key. To enable them, copy the example
and add your key:

```bash
cp .env.local.example .env.local
# then edit .env.local:
ANTHROPIC_API_KEY=sk-ant-...
```

Get a key at https://console.anthropic.com. Restart the dev server after adding it.

### Switching models

The in-app model is pinned to `claude-sonnet-4-6` (per spec) but overridable:

```bash
# .env.local
LANGLANG_MODEL=claude-fable-5     # most capable; also claude-opus-4-8, etc.
```

Thinking config is model-aware (`lib/claude.ts` → `think()`), so switching to
Fable/Opus works without code changes. Note Fable is priced higher and requires
30-day data retention on your Anthropic org.

## Deploy (Vercel)

```bash
vercel                              # preview
vercel --prod                       # production

# set the key for the deployed functions:
vercel env add ANTHROPIC_API_KEY production
vercel --prod                       # redeploy so functions pick it up
```

The GitHub repo is connected to the Vercel project, so **pushing to `main`
auto-deploys**. User data is browser-local, so there's no database to provision.

## Android

The app is already an installable PWA — on Android Chrome, "Add to Home Screen"
runs it standalone. To ship it to the Play Store, wrap the PWA as a Trusted Web
Activity with [Bubblewrap](https://github.com/GoogleChromeLabs/bubblewrap):

```bash
npx @bubblewrap/cli init --manifest https://langlang-ashen.vercel.app/manifest.json
npx @bubblewrap/cli build
```

Then host `/.well-known/assetlinks.json` on the domain to verify ownership and
upload the generated `.aab` to Google Play Console. (Requires a 512×512 maskable
PNG icon in the manifest.)
