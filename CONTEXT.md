# Nihongo Start — Design Context

A single-source design brief for generating new UI that fits this app. Paste this
into Claude (or hand it to a designer) alongside a request like *"design a flashcard
quiz screen for this app"* and the output will match the existing product.

---

## 1. What the app is

A calm, **beginner-first Japanese reference and practice app**. The user is an
**absolute beginner** with zero prior Japanese. The guiding rule: **every piece of
Japanese script is always accompanied by romaji (English letters)** so nothing is
intimidating. The mood is **quiet, uncluttered, confidence-building** — the opposite
of a gamified streak app. "The characters are the content"; chrome stays minimal.

Not: a social app, not gamified/loud, not cluttered. No dark patterns, no FOMO.

---

## 2. Users & principles

- **Who:** total beginners, likely on a phone, dipping in for a few minutes.
- **Principles:**
  1. Romaji always shown next to Japanese. Never make the user guess a reading.
  2. Big, legible characters. The script is the hero.
  3. One clear action per screen. Minimal chrome.
  4. Reassuring, plain-English microcopy. No jargon.
  5. Everything works offline except Translate (which degrades gracefully).
  6. Tap targets ≥ 44px; works one-handed.

---

## 3. Information architecture

Six tabs in a fixed **bottom nav** (mobile-first, but centered in a `max-w-3xl`
column on desktop):

| Tab | Route | Purpose |
|---|---|---|
| Hiragana | `/hiragana` | Full gojūon chart, Basic/Dakuten/Combos tabs |
| Katakana | `/katakana` | Same chart, loanword examples + chōonpu note |
| Kanji | `/kanji` | JLPT N5 set, search + category filter |
| Phrases | `/phrases` | Everyday phrases grouped by situation |
| Draw | `/draw` | Trace kana/kanji on grid paper over a guide |
| Translate | `/translate` | EN ⇄ JA, always script + romaji + English |

`/` redirects to `/hiragana`. Detail views open as a **bottom-sheet modal**
(slides up on mobile, centers on desktop), never a new page.

---

## 4. Visual language (design tokens)

All tokens live in `app/globals.css` under `@theme` (Tailwind v4). Use these exact
names as Tailwind utilities (`bg-surface`, `text-muted`, `border-line`, etc.).

### Color (dark theme — the default and only theme today)
| Token | Hex | Use |
|---|---|---|
| `--color-bg` | `#0f1115` | app background |
| `--color-surface` | `#171a21` | cards, nav, inputs |
| `--color-surface2` | `#1f232c` | nested panels, example boxes |
| `--color-line` | `#2b303b` | borders, dividers, grid lines |
| `--color-ink` | `#f2f4f8` | primary text |
| `--color-muted` | `#9aa3b2` | secondary text, labels |
| `--color-accent` | `#ff5a5f` | primary action, active state (warm red — nod to the flag) |
| `--color-accent2` | `#4aa8ff` | romaji text, secondary highlights (calm blue) |

**Accent discipline:** red `accent` = the one primary action or active tab per view.
Blue `accent2` = *romaji only* and quiet secondary emphasis. Don't introduce new hues;
add a semantic token if a genuinely new meaning appears (e.g. success green).

### Typography
- **Japanese script:** Noto Sans JP (`--font-jp`, class `.jp`). **Always** use `.jp`
  on any Japanese character or word — system fonts render Japanese poorly.
- **UI/Latin:** Inter (`--font-ui`).
- **Romaji:** class `.romaji` → colored `accent2`, slight letter-spacing.
- Sizes: character in a grid cell ≥ 32px (`text-2xl`/`3xl`); character in a detail
  view 64px+ (`text-7xl`); body 14–16px; labels 10–11px uppercase, `tracking-widest`,
  `text-muted`.

### Shape, spacing, motion
- **Radius:** cards/inputs `rounded-xl` (12px); modals/boards `rounded-2xl` (16px);
  chips/pills `rounded-full`.
- **Borders:** 1px `border-line`. Active/selected: `border-accent` +
  `bg-accent/10` + `text-accent`.
- **Spacing:** page content in `px-4`; header `pt-6 pb-4`; card padding `p-4`;
  vertical rhythm `space-y-2`. Body reserves `pb-20` for the fixed nav.
- **Motion (Framer Motion):** subtle only. Modal = spring slide-up
  (`stiffness: 320, damping: 30`). Result reveals = fade + 10px rise. No bounce,
  no confetti, no attention-grabbing loops. Motion should feel like paper settling.

---

## 5. Component vocabulary (reuse these; don't reinvent)

- **`PageHeader`** — accent JP glyph + bold title + one-line muted subtitle. Every
  page starts with it.
- **`Nav`** — fixed bottom tab bar; active tab is `accent`, shows JP glyph + label.
- **`Modal`** — bottom-sheet on mobile / centered card on desktop; closes on backdrop
  tap or Esc. All detail views use it.
- **Character card** — bordered `surface` tile, centered: big `.jp` glyph + small
  `.romaji` beneath. Hover: `border-accent`, `bg-surface2`.
- **Filter chips** — `rounded-full` pills; selected = accent style. Used for kanji
  categories and phrase groups.
- **Segmented tabs** — 3 equal-width bordered buttons (Basic/Dakuten/Combos,
  set switchers). Selected = accent style.
- **Example box** — `surface2` panel with an uppercase `muted` label ("example word"),
  a tappable `.jp` word (🔊 to hear), `.romaji`, and English gloss.
- **Search input / textarea** — `surface` bg, `border-line`, focus `border-accent`.

**Speaker affordance:** a 🔊 next to any Japanese means "tap to hear" (Web Speech,
ja-JP). Only render it after mount (client-only) to avoid hydration mismatches — use
the `useMounted()` gate.

---

## 6. Content & correctness rules (non-negotiable)

- **Romaji everywhere**, in **Hepburn** style: shi (not si), chi (not ti), tsu (not tu),
  fu (not hu). Long vowels use **macrons**: ō, ū (e.g. `kōhī`, `Tōkyō`).
- Japanese always rendered with the `.jp` class.
- On'yomi shown in **katakana**, kun'yomi in **hiragana** (that's the convention
  learners see everywhere).
- Exactly **46 basic kana** per syllabary in the main grid — never include obsolete
  ゐ/ゑ. Diacritics: 20 dakuten + 5 handakuten; 33 combination (yōon).
- Kanji scope is **JLPT N5 only** (~100). Don't invent readings or stroke counts.
- Keep explanations to ~1 sentence. This is a reference, not a textbook.

---

## 7. Data shapes (what UI binds to)

Local JSON in `/data`. Types in `lib/types.ts`.

```ts
// hiragana.json / katakana.json
Kana = { char, romaji, type: "basic"|"dakuten"|"handakuten"|"yoon", row, example?: { word, romaji, meaning } }

// kanji.json
Kanji = { kanji, meaning, onyomi: string[], kunyomi: string[], strokes, category, examples: { word, romaji, meaning }[] }

// phrases.json
Phrase = { japanese, romaji, english, category, pronunciation }  // pronunciation = hyphenated hint, e.g. "koh-nee-chee-wah"

// strokes.json (for stroke-order animation) — keyed by single character
Strokes = Record<char, { viewBox: string, paths: string[] }>  // paths in stroke order
```

---

## 8. Tone of voice (microcopy)

Warm, plain, encouraging. Short. Examples that set the register:
- Subtitles: *"The first alphabet — used for native Japanese words and grammar. Tap any character for an example."*
- Empty state: *"No kanji match 'water'."*
- Draw hint: *"Trace the faint character with your finger or mouse. Turn the guide off to test yourself."*
- Error: *"Translation needs a Claude API key — add ANTHROPIC_API_KEY and restart."*

Avoid: exclamation-heavy hype, streak guilt, emoji spam (one functional emoji like 🔊/🎲 is fine).

---

## 9. Accessibility & platform

- Contrast: ink/muted on bg both pass AA. Accent-on-white text uses `text-white`.
- Everything keyboard-reachable; modal closes on Esc; inputs have real placeholders.
- Touch-first: canvas uses Pointer Events with `touch-none`; hit areas ≥ 44px.
- No layout shift; reserve `pb-20` for the nav.
- Responsive: single centered column `max-w-3xl`; kana grids 5 cols, kanji grid
  3 cols mobile → 5 desktop.

---

## 10. How to extend (a checklist for new UI)

When designing a new screen or component:
1. Start with `PageHeader` (JP glyph + title + one-line subtitle).
2. Use existing tokens/components above; don't add new colors or radii.
3. Any Japanese → `.jp`; any reading → `.romaji`; Hepburn + macrons.
4. Details open in `Modal`, not a new route.
5. One primary `accent` action per view; everything else is `line`/`muted`.
6. Client-only bits (speech, canvas, random, `Date`) behind `useMounted()` to keep
   SSR clean.
7. If it's a *practice* surface, mirror Draw/quiz patterns: clear prompt, big target,
   simple controls (Prev / Random / Next), gentle feedback.
8. Persist any user state to `localStorage` (no backend); keep it optional.

---

## 11. Attribution

Stroke-order data: **KanjiVG** (© Ulrich Apel, CC BY-SA 3.0). Any UI that shows
stroke order must keep a visible credit link.
