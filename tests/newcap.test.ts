// Daily new-word quota (state.newPerDay). The promise: once today's quota of
// words has entered the deck, the FEED stops dealing new-word cards (and i+1
// sentences that would introduce one), while every other card keeps flowing
// and the feed's pacing rules still hold. Lessons/packs/mining are explicit
// choices: they are never blocked, but the words they add use up the quota.

import { describe, it, expect, beforeEach } from "vitest";
import { nextFeedItem, type FeedContext } from "@/lib/feed";
import { qualifying } from "@/lib/sentences";
import { dailyQuests } from "@/lib/quests";
import {
  addNewWord,
  entryToCard,
  getState,
  newWordsLeft,
  newWordsToday,
  replaceState,
  setNewPerDay,
  todayStr,
  NEW_PER_DAY_OPTIONS,
} from "@/lib/store";
import { SEED, UNIT_SIZE, dealIndexAt, dealPosOf } from "@/lib/seed";
import type { AppState, Card, FeedItem, Lang, SentenceData } from "@/lib/types";

const DAY = 86_400_000;

function midnight(now = Date.now()): number {
  const d = new Date(now);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

// the first `n` words in deal order, as cards born at `createdAt`
function dealt(lang: Lang, n: number, createdAt = Date.now(), from = 0): Card[] {
  const out: Card[] = [];
  for (let pos = from; pos < from + n; pos++) {
    const card = entryToCard(lang, SEED[lang][dealIndexAt(lang, pos)]);
    // reps 1 so quizzes/listens have a pool once new words stop
    out.push({ ...card, createdAt, fsrs: { ...card.fsrs, reps: 1 } });
  }
  return out;
}

function feedState(cards: Card[], newPerDay: number | null, lang: Lang = "ja"): AppState {
  const learned = cards.filter((c) => c.lang === lang).length;
  return {
    lang,
    cards,
    newIndex: { ja: lang === "ja" ? learned : 0, de: lang === "de" ? learned : 0 },
    newPerDay,
  } as AppState;
}

function ctx(over: Partial<FeedContext> = {}): FeedContext {
  return {
    recentKinds: ["quiz"],
    queuedCardIds: new Set(),
    queuedNewCount: 0,
    lastWasFail: false,
    sinceStatus: 0,
    newDoneShown: true,
    ...over,
  };
}

function kinds(state: AppState, c: FeedContext, runs = 1500): Set<FeedItem["kind"]> {
  const seen = new Set<FeedItem["kind"]>();
  for (let i = 0; i < runs; i++) seen.add(nextFeedItem(state, c).kind);
  return seen;
}

describe("newWordsToday / newWordsLeft", () => {
  it("counts only today's word cards in the given language", () => {
    const yesterday = midnight() - 1000;
    const sentenceCard = { ...dealt("ja", 1)[0], id: "ja:文", type: "sentence" } as Card;
    const s = {
      cards: [
        ...dealt("ja", 3), // today
        ...dealt("ja", 4, yesterday, 3), // yesterday
        ...dealt("de", 2), // other language
        sentenceCard, // Dojo mistake / mined sentence — not a word
      ],
      newPerDay: 10,
    };
    expect(newWordsToday(s, "ja")).toBe(3);
    expect(newWordsToday(s, "de")).toBe(2);
    expect(newWordsLeft(s, "ja")).toBe(7);
    expect(newWordsLeft(s, "de")).toBe(8);
  });

  it("is unlimited when newPerDay is null and never negative when over", () => {
    expect(newWordsLeft({ cards: dealt("ja", 40), newPerDay: null }, "ja")).toBe(Infinity);
    expect(newWordsLeft({ cards: dealt("ja", 12), newPerDay: 5 }, "ja")).toBe(0);
  });

  it("offers 5/10/15/20/unlimited", () => {
    expect([...NEW_PER_DAY_OPTIONS]).toEqual([5, 10, 15, 20, null]);
  });
});

describe("feed gating", () => {
  it("deals new words while under the quota", () => {
    expect(kinds(feedState(dealt("ja", 3), 10), ctx()).has("new")).toBe(true);
  });

  it("never deals a new word once the quota is used up", () => {
    const s = feedState(dealt("ja", 10), 10);
    const seen = kinds(s, ctx(), 3000);
    expect(seen.has("new")).toBe(false);
    // ...but the rest of the feed keeps going
    expect(seen.has("review")).toBe(true);
    expect(seen.has("quiz")).toBe(true);
    expect(seen.has("grammar")).toBe(true);
  });

  it("counts queued-but-unanswered new cards against the quota", () => {
    const s = feedState(dealt("ja", 9), 10);
    expect(kinds(s, ctx({ queuedNewCount: 1 }), 3000).has("new")).toBe(false);
    expect(kinds(s, ctx({ queuedNewCount: 0 })).has("new")).toBe(true);
  });

  it("frees the slot of a new card the reader scrolled past unanswered", () => {
    // 3 new cards queued, all already scrolled past; 9 added, cap 10
    const s = feedState(dealt("ja", 9), 10);
    expect(kinds(s, ctx({ queuedNewCount: 3, upcomingNewCount: 0 })).has("new")).toBe(true);
    expect(kinds(s, ctx({ queuedNewCount: 3, upcomingNewCount: 1 }), 3000).has("new")).toBe(false);
  });

  it("only counts the feed's language", () => {
    // 10 German words today don't spend the Japanese quota
    const s = feedState([...dealt("de", 10), ...dealt("ja", 2)], 10, "ja");
    expect(kinds(s, ctx()).has("new")).toBe(true);
  });

  it("yesterday's words don't count", () => {
    const s = feedState(dealt("ja", 30, midnight() - 1000), 10);
    expect(kinds(s, ctx()).has("new")).toBe(true);
  });

  it("unlimited never gates", () => {
    expect(kinds(feedState(dealt("ja", 60), null), ctx()).has("new")).toBe(true);
  });

  it("new items still follow the frequency deal order from the pointer", () => {
    const s = feedState(dealt("ja", 3), 10);
    for (let i = 0; i < 300; i++) {
      const it = nextFeedItem(s, ctx({ queuedNewCount: 2 }));
      if (it.kind === "new") expect(it.entryIndex).toBe(dealIndexAt("ja", 3 + 2));
    }
  });
});

describe("'new words done' status card", () => {
  it("is dealt once the quota runs out, if not already queued", () => {
    const s = feedState(dealt("ja", 10), 10);
    const it = nextFeedItem(s, ctx({ newDoneShown: false }));
    expect(it).toMatchObject({ kind: "status", note: "new-done" });
  });

  it("is never the opening card of a feed session", () => {
    const s = feedState(dealt("ja", 10), 10);
    for (let i = 0; i < 300; i++) {
      const it = nextFeedItem(s, ctx({ newDoneShown: false, recentKinds: [] }));
      expect(it.kind === "status" && it.note === "new-done").toBe(false);
    }
  });

  it("is not repeated, and not shown while words remain or with no limit", () => {
    const cases: [AppState, boolean][] = [
      [feedState(dealt("ja", 10), 10), true], // already shown
      [feedState(dealt("ja", 4), 10), false], // quota not reached
      [feedState(dealt("ja", 40), null), false], // unlimited
    ];
    for (const [s, shown] of cases) {
      for (let i = 0; i < 300; i++) {
        const it = nextFeedItem(s, ctx({ newDoneShown: shown, sinceStatus: 0 }));
        expect(it.kind === "status" && it.note === "new-done").toBe(false);
      }
    }
  });
});

describe("feed rules still hold at the quota", () => {
  const s = feedState(dealt("ja", 10), 10);

  it("never three reviews in a row", () => {
    const seen = kinds(s, ctx({ recentKinds: ["review", "review"] }), 2000);
    expect(seen.has("review")).toBe(false);
  });

  it("after a fail the next card is an easy win (no new word to fall back on)", () => {
    const seen = kinds(s, ctx({ lastWasFail: true }), 2000);
    for (const k of seen) expect(["quiz", "meme", "status"]).toContain(k);
    expect(seen.has("quiz")).toBe(true);
  });

  it("a simulated scroll never deals a new word and keeps the pacing rules", () => {
    const queue: FeedItem[] = [];
    let lastWasFail = false;
    for (let i = 0; i < 400; i++) {
      const recentKinds = queue.slice(-2).map((it) => it.kind);
      const it = nextFeedItem(
        s,
        ctx({
          recentKinds,
          lastWasFail,
          newDoneShown: queue.some((q) => q.kind === "status" && q.note === "new-done"),
          sinceStatus: 0,
        })
      );
      expect(it.kind).not.toBe("new");
      if (recentKinds.length === 2 && recentKinds.every((k) => k === "review")) {
        expect(it.kind).not.toBe("review");
      }
      if (lastWasFail) expect(["quiz", "meme", "status"]).toContain(it.kind);
      queue.push(it);
      lastWasFail = Math.random() < 0.2;
    }
    // exactly one "done" notice, as the second card
    const notices = queue.filter((q) => q.kind === "status" && q.note === "new-done");
    expect(notices).toHaveLength(1);
    expect(queue[1]).toBe(notices[0]);
  });
});

describe("i+1 sentences respect the quota", () => {
  // a sentence of one known word + the current new word (seed entry 3)
  const known = (() => {
    const c = entryToCard("ja", SEED.ja[0]);
    return { ...c, fsrs: { ...c.fsrs, stability: 30, due: Date.now() + 30 * DAY } };
  })();
  const sentence: SentenceData = {
    id: 1,
    text: SEED.ja[0].word + SEED.ja[3].word,
    translation: "test",
    tokens: [
      { surface: SEED.ja[0].word, seedIndex: 0 },
      { surface: SEED.ja[3].word, seedIndex: 3 },
    ],
  };
  const st = { cards: [known], newIndex: { ja: dealPosOf("ja", 3), de: 0 } };

  it("may introduce the current new word while quota remains", () => {
    expect(qualifying([sentence], st, "ja", Date.now(), true)).toHaveLength(1);
  });

  it("drops it once the quota is spent (grading would add the word)", () => {
    expect(qualifying([sentence], st, "ja", Date.now(), false)).toHaveLength(0);
  });

  it("still serves sentences whose unknown is a due card", () => {
    const due = { ...entryToCard("ja", SEED.ja[3]), fsrs: { ...known.fsrs, stability: 1, due: Date.now() - DAY } };
    expect(qualifying([sentence], { ...st, cards: [known, due] }, "ja", Date.now(), false)).toHaveLength(1);
  });
});

describe("store: setting + explicit adds", () => {
  beforeEach(() => {
    replaceState({ ...getState(), cards: [], newIndex: { ja: 0, de: 0 }, newPerDay: 10 });
  });

  it("defaults to 10 when a synced/stored state predates the setting", () => {
    const legacy = { ...getState() } as Partial<AppState>;
    delete legacy.newPerDay;
    replaceState(legacy as AppState);
    expect(getState().newPerDay).toBe(10);
  });

  it("persists every picker value, including unlimited, through a sync round-trip", () => {
    for (const n of NEW_PER_DAY_OPTIONS) {
      setNewPerDay(n);
      expect(getState().newPerDay).toBe(n);
      // what lib/sync.ts pushes/pulls is the JSON of the whole state
      replaceState(JSON.parse(JSON.stringify(getState())));
      expect(getState().newPerDay).toBe(n);
    }
  });

  it("a Path unit lesson still deals its whole unit past the quota, and it counts", () => {
    setNewPerDay(5);
    // the Lesson.tsx finishWin loop for unit 0
    const end = UNIT_SIZE;
    for (let pos = getState().newIndex.ja; pos < end; pos++) addNewWord("ja", dealIndexAt("ja", pos));
    const s = getState();
    expect(s.cards.filter((c) => c.lang === "ja")).toHaveLength(UNIT_SIZE);
    expect(s.newIndex.ja).toBe(UNIT_SIZE); // pointer = consumed deal positions
    expect(newWordsToday(s, "ja")).toBe(UNIT_SIZE);
    expect(newWordsLeft(s, "ja")).toBe(0);
    expect(kinds(s, ctx(), 2000).has("new")).toBe(false);
  });

  it("feed adds walk the deal order and stop at the quota", () => {
    setNewPerDay(5);
    for (let i = 0; i < 400; i++) {
      const it = nextFeedItem(getState(), ctx({ sinceStatus: 0 }));
      if (it.kind === "new") addNewWord("ja", it.entryIndex);
    }
    const s = getState();
    expect(newWordsToday(s, "ja")).toBe(5);
    expect(s.newIndex.ja).toBe(5);
    for (let pos = 0; pos < 5; pos++) {
      expect(s.cards.some((c) => c.word === SEED.ja[dealIndexAt("ja", pos)].word)).toBe(true);
    }
  });
});

describe("the 'learn N new words' quest stays winnable under the quota", () => {
  // find a date whose quests include newwords at a given rolled target
  function dateWithNewwords(target: number): string {
    for (let d = 1; d < 2000; d++) {
      const date = todayStr(new Date(Date.UTC(2026, 0, d)));
      if (dailyQuests(date).some((q) => q.key === "newwords" && q.target === target)) return date;
    }
    throw new Error(`no date rolls newwords=${target}`);
  }

  it("clamps the rolled target (and label) to the cap, untouched when unlimited", () => {
    const date = dateWithNewwords(12);
    const at = (cap: number | null) => dailyQuests(date, cap).find((q) => q.key === "newwords")!;
    expect(at(null).target).toBe(12);
    expect(at(20).target).toBe(12);
    expect(at(10)).toMatchObject({ target: 10, label: "Learn 10 new words" });
    expect(at(5).target).toBe(5);
    // the other quests don't move
    const others = (cap: number | null) =>
      dailyQuests(date, cap).filter((q) => q.key !== "newwords");
    expect(others(5)).toEqual(others(null));
  });

  it("never exceeds the cap on any date, for any picker value", () => {
    for (let d = 1; d < 400; d++) {
      const date = todayStr(new Date(Date.UTC(2026, 0, d)));
      for (const cap of NEW_PER_DAY_OPTIONS) {
        for (const q of dailyQuests(date, cap)) {
          if (q.key === "newwords" && cap != null) expect(q.target).toBeLessThanOrEqual(cap);
        }
      }
    }
  });

  it("changing the limit re-fits today's quest; a met lower target completes with a pack", () => {
    const date = dateWithNewwords(12);
    const quests = dailyQuests(date).map((q) =>
      q.key === "newwords" ? { ...q, progress: 6 } : q
    );
    replaceState({ ...getState(), questDate: date, quests, packs: 0, newPerDay: null });

    setNewPerDay(10);
    let q = getState().quests.find((x) => x.key === "newwords")!;
    expect(q).toMatchObject({ target: 10, progress: 6, done: false });

    setNewPerDay(5);
    q = getState().quests.find((x) => x.key === "newwords")!;
    expect(q).toMatchObject({ target: 5, progress: 5, done: true });
    expect(getState().packs).toBe(1);

    // done stays done (no re-mint) when the limit goes back up
    setNewPerDay(20);
    expect(getState().quests.find((x) => x.key === "newwords")!.done).toBe(true);
    expect(getState().packs).toBe(1);
  });
});
