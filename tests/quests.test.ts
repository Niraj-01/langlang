// Daily quests are derived deterministically from the date string. A signed
// right-shift here once produced targets of `undefined` ("Learn undefined new
// words") on dates whose hash had the high bit set — these tests sweep enough
// dates to catch that class of bug permanently.

import { describe, it, expect } from "vitest";
import { dailyQuests, petStage, petStageName, nextStageXp, PET_STAGES, COSMETICS, cosmeticById } from "@/lib/quests";

function everyDayOfYears(years: number[]): string[] {
  const out: string[] = [];
  for (const y of years) {
    for (let m = 0; m < 12; m++) {
      for (let d = 1; d <= 28; d++) {
        out.push(`${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`);
      }
    }
  }
  return out;
}

describe("dailyQuests", () => {
  const dates = everyDayOfYears([2024, 2025, 2026, 2027, 2028]);

  it("always returns exactly 3 quests with valid, positive targets", () => {
    for (const date of dates) {
      const qs = dailyQuests(date);
      expect(qs, date).toHaveLength(3);
      for (const q of qs) {
        expect(Number.isInteger(q.target), `${date} ${q.key} target=${q.target}`).toBe(true);
        expect(q.target, `${date} ${q.key}`).toBeGreaterThan(0);
        expect(q.progress).toBe(0);
        expect(q.done).toBe(false);
      }
    }
  });

  it("never renders 'undefined' or 'NaN' into a quest label", () => {
    for (const date of dates) {
      for (const q of dailyQuests(date)) {
        expect(q.label, date).not.toMatch(/undefined|NaN/);
      }
    }
  });

  it("is deterministic for a given day", () => {
    for (const date of dates.slice(0, 50)) {
      expect(dailyQuests(date)).toEqual(dailyQuests(date));
    }
  });

  it("picks 3 distinct quest types", () => {
    for (const date of dates.slice(0, 200)) {
      const keys = dailyQuests(date).map((q) => q.key);
      expect(new Set(keys).size, date).toBe(3);
    }
  });
});

describe("pet evolution", () => {
  it("stages advance monotonically with XP and never go out of range", () => {
    let last = 0;
    for (let xp = 0; xp <= 20_000; xp += 137) {
      const s = petStage(xp);
      expect(s).toBeGreaterThanOrEqual(0);
      expect(s).toBeLessThan(PET_STAGES.length);
      expect(s).toBeGreaterThanOrEqual(last);
      expect(petStageName(xp)).toBe(PET_STAGES[s].name);
      last = s;
    }
  });

  it("nextStageXp returns the next cutoff, and null once maxed", () => {
    expect(nextStageXp(0)).toBe(PET_STAGES[1].min);
    const maxMin = PET_STAGES[PET_STAGES.length - 1].min;
    expect(nextStageXp(maxMin)).toBeNull();
  });
});

describe("cosmetics", () => {
  it("every cosmetic has a unique id and a drawable slot", () => {
    const ids = COSMETICS.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const c of COSMETICS) {
      expect(["head", "face", "neck"]).toContain(c.slot);
      expect(cosmeticById(c.id)).toEqual(c);
    }
  });

  it("returns undefined for an unknown id rather than throwing", () => {
    expect(cosmeticById("nope")).toBeUndefined();
  });
});
