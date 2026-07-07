# Nihongo Start — Future Implementation Backlog

A living list of features to add. Grouped by theme, tagged with **value** and
**effort**, and a **status**. Pull from the top of each group. When you build one,
move it to "Done" at the bottom and note the files touched.

Effort: 🟢 small · 🟡 medium · 🔴 large   ·   Value: ⭐ (nice) → ⭐⭐⭐ (high)

---

## 1. Retention — turn "browse" into "learn" (highest priority)
The app is currently a reference; these make it a trainer.

- **Flashcard quiz** ⭐⭐⭐ 🟢 — show a character → pick the romaji (multiple choice),
  and the reverse; also kanji→meaning and phrase→meaning. Instant feedback, keep score.
- **Progress tracking (localStorage)** ⭐⭐⭐ 🟢 — mark characters "learned"; coverage
  ring per chart ("Hiragana 32/46"); optional daily streak. Show learned state on the
  grid tiles and Draw board. No backend.
- **SRS-lite review** ⭐⭐⭐ 🟡 — a "Review" tab that resurfaces missed items on a
  spaced schedule. A stripped-down FSRS (see the sibling `langlang` project's
  `lib/fsrs.ts` for a full port to borrow from).
- **Writing quiz** ⭐⭐ 🟢 — reuse the Draw canvas: prompt with romaji, user draws from
  memory, reveal the guide to self-check. (Pairs with stroke order.)
- **Listening quiz** ⭐⭐ 🟢 — play ja-JP audio, pick the matching kana/word.

## 2. Kana & kanji depth
- **Stroke-order animations** ⭐⭐⭐ 🟡 — *IN PROGRESS* — animate strokes 1-by-1 from
  KanjiVG data (`data/strokes.json`), numbered starts, replay control; surface on the
  Draw board and in detail modals.
- **Confusable-pairs drills** ⭐⭐ 🟢 — targeted practice for シ/ツ, ソ/ン, ね/れ/わ, き/さ.
- **Radical / component breakdown** ⭐⭐ 🟡 — 休 = 人 + 木, with a one-line mnemonic
  (Claude-generated + cached per kanji).
- **Kanji lookup by radical or stroke count** ⭐ 🟢.
- **Kanji mnemonics** ⭐⭐ 🟡 — short memory hooks per character (Claude, cached).

## 3. Reading & real Japanese
- **Furigana reader** ⭐⭐⭐ 🟡 — paste any sentence → furigana + per-word gloss + natural
  translation (an `/api/` route; calmer cousin of langlang's sentence mining).
- **Numbers & counting trainer** ⭐⭐ 🟡 — dates, prices, times, counters
  (一つ / 一人 / 一枚). A classic beginner wall a static chart doesn't fix.
- **Particle mini-guide** ⭐⭐ 🟢 — は / が / を / に / で with one example each.

## 4. Practice & input
- **Typing / IME practice** ⭐⭐ 🟡 — type romaji → build kana (teaches real JP input).
- **Speaking practice (shadowing)** ⭐⭐ 🟡 — mic + STT scoring vs a target phrase
  (borrow `lib/similarity.ts` + `lib/speech.ts` from the feed side of this project).

## 5. Polish & reach
- **Progressive "hide romaji" toggle** ⭐⭐⭐ 🟢 — a switch to hide romaji as the user
  improves, so the app grows with them. Tiny change, big longevity.
- **Light / dark theme toggle** ⭐⭐ 🟢 — currently dark-only; add a light palette +
  `data-theme` switch (tokens already centralized in `globals.css`).
- **Favorites / bookmarks** ⭐⭐ 🟢 — star tricky characters/phrases into a custom set.
- **Installable PWA + offline** ⭐⭐ 🟢 — manifest + service worker; everything but
  Translate already works offline (reuse `public/sw.js` for a template).
- **Adjustable TTS speed** ⭐ 🟢 — 0.5×–1× slider on pronunciation (beginners want slow).
- **Print / PDF export** of the kana charts ⭐ 🟢.
- **Deploy to Vercel** ⭐⭐ 🟢 — push to GitHub + `vercel --prod`; add `ANTHROPIC_API_KEY`
  in the dashboard.

## 6. Content expansion
- More phrases / situational packs (shopping, doctor, directions).
- Counters reference (一つ、一枚、一本、一人…).
- Verb-form basics (masu / te-form) and adjective conjugation (i / na).
- JLPT N4 kanji as a second set (structure already supports categories/levels).

---

## Recommended next three
1. Flashcard quiz + localStorage progress (converts reference → trainer; shared plumbing).
2. Progressive "hide romaji" toggle (longevity, tiny).
3. Stroke-order animations (highest-want; pairs with Draw). ← *building now*

---

## Done
- **Stroke-order animations** — *(in progress; move here when shipped)*
- Core v1: Hiragana, Katakana, Kanji (N5, search + categories), Phrases, Draw
  (trace over guide), Translate (EN⇄JA, Claude), ja-JP pronunciation on everything.
