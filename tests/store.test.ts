// Pure, state-in/state-out helpers from the store, plus the derived views the
// UI leans on. These need no DOM: the store guards localStorage behind a
// `typeof window` check and starts from defaultState().

import { describe, it, expect } from "vitest";
import { levelFromXp, cardIdFor, entryToCard, dueCards, todayStr } from "@/lib/store";
import { newFsrsState } from "@/lib/fsrs";
import { SEED } from "@/lib/seed";
import type { AppState, Card } from "@/lib/types";

const NOW = Date.UTC(2026, 5, 15);
const DAY = 86_400_000;

function stateWith(cards: Card[]): AppState {
  return { cards } as unknown as AppState;
}

describe("levelFromXp", () => {
  it("starts at level 1 with zero XP", () => {
    const { level, into } = levelFromXp(0);
    expect(level).toBe(1);
    expect(into).toBe(0);
  });

  it("never regresses and always reports a positive span", () => {
    let last = 1;
    for (let xp = 0; xp < 100_000; xp += 373) {
      const { level, into, span } = levelFromXp(xp);
      expect(level).toBeGreaterThanOrEqual(last);
      expect(span).toBeGreaterThan(0);
      expect(into).toBeGreaterThanOrEqual(0);
      expect(into).toBeLessThanOrEqual(span);
      last = level;
    }
  });
});

describe("cardIdFor / entryToCard", () => {
  it("namespaces ids by language so 水 in ja never collides with a de word", () => {
    expect(cardIdFor("ja", "水")).toBe("ja:水");
    expect(cardIdFor("de", "Wasser")).toBe("de:Wasser");
    expect(cardIdFor("ja", "x")).not.toBe(cardIdFor("de", "x"));
  });

  it("copies the teaching fields (tip/mnemonic/pitch) onto the card", () => {
    const entry = SEED.ja.find((e) => e.word === "水")!;
    const card = entryToCard("ja", entry);
    expect(card.id).toBe("ja:水");
    expect(card.word).toBe("水");
    expect(card.reading).toBe(entry.reading);
    expect(card.tip).toBe(entry.tip);
    expect(card.pitch).toBe(entry.pitch);
    expect(card.fsrs.phase).toBe("new");
  });

  it("types German nouns as noun_de and keeps the article", () => {
    const noun = SEED.de.find((e) => e.pos === "noun")!;
    const card = entryToCard("de", noun);
    expect(card.type).toBe("noun_de");
    expect(card.article).toBe(noun.article);
    expect(card.plural).toBe(noun.plural);
  });
});

describe("dueCards", () => {
  const mk = (id: string, lang: "ja" | "de", due: number, phase: Card["fsrs"]["phase"]): Card =>
    ({ id, lang, word: id, meaning: id, fsrs: { ...newFsrsState(NOW), due, phase } }) as Card;

  it("surfaces a just-added word immediately (new cards are created due-now)", () => {
    // this is the real guarantee: entryToCard -> newFsrsState sets due = now,
    // so a word added to the deck is reviewable on the very next feed item.
    const card = entryToCard("ja", SEED.ja[0]);
    expect(card.fsrs.phase).toBe("new");
    const s = stateWith([card]);
    expect(dueCards(s, "ja", Date.now()).map((c) => c.id)).toEqual([card.id]);
  });

  it("returns cards whose due time has passed, and excludes future review cards", () => {
    const s = stateWith([
      mk("past", "ja", NOW - DAY, "review"),
      mk("future", "ja", NOW + DAY, "review"),
    ]);
    const ids = dueCards(s, "ja", NOW).map((c) => c.id);
    expect(ids).toContain("past");
    expect(ids).not.toContain("future");
  });

  it("never leaks the other language's cards", () => {
    const s = stateWith([mk("j", "ja", NOW - DAY, "review"), mk("d", "de", NOW - DAY, "review")]);
    expect(dueCards(s, "ja", NOW).map((c) => c.id)).toEqual(["j"]);
    expect(dueCards(s, "de", NOW).map((c) => c.id)).toEqual(["d"]);
  });
});

describe("todayStr", () => {
  it("formats a local date as yyyy-mm-dd with zero padding", () => {
    expect(todayStr(new Date(2026, 0, 5))).toBe("2026-01-05");
    expect(todayStr(new Date(2026, 11, 31))).toBe("2026-12-31");
  });

  it("is stable across the same day and changes across days", () => {
    const a = new Date(2026, 5, 15, 0, 0, 1);
    const b = new Date(2026, 5, 15, 23, 59, 59);
    const c = new Date(2026, 5, 16, 0, 0, 1);
    expect(todayStr(a)).toBe(todayStr(b));
    expect(todayStr(a)).not.toBe(todayStr(c));
  });
});
