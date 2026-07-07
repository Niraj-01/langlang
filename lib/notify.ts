"use client";

// Menace-mode client helper. Real background push needs a service worker +
// push subscription (phase 4 / PWA); here we generate the roast on demand and
// surface it via the Notifications API when permitted, else return it for
// in-app display. Local fallback roasts keep it working offline.

import type { AppState } from "./types";
import { dueCards, todayStr } from "./store";

const LOCAL_ROASTS = [
  "day {streak} of you pretending you'll be fluent by December.",
  "{due} cards rotting in your deck while you scroll something else. bold.",
  "your pet misses you. your streak is on life support. do something.",
  "level {level} and still can't order coffee? we don't say that out loud.",
  "the words aren't going to learn themselves, bestie. unfortunately.",
];

export function notifyAvailable(): boolean {
  return typeof window !== "undefined" && "Notification" in window;
}

export function notifyPermission(): NotificationPermission | "unsupported" {
  if (!notifyAvailable()) return "unsupported";
  return Notification.permission;
}

export async function requestNotify(): Promise<NotificationPermission> {
  if (!notifyAvailable()) return "denied";
  try {
    return await Notification.requestPermission();
  } catch {
    return "denied";
  }
}

function localRoast(state: AppState): string {
  const due = dueCards(state, state.lang).length;
  const pick = LOCAL_ROASTS[Math.floor(Math.random() * LOCAL_ROASTS.length)];
  return pick
    .replace("{streak}", String(state.streak.current))
    .replace("{due}", String(due))
    .replace("{level}", String(Math.max(1, Math.floor(state.xp / 200) + 1)));
}

function daysSince(lastActive: string): number {
  if (!lastActive) return 0;
  const then = new Date(lastActive + "T00:00:00").getTime();
  const now = new Date(todayStr() + "T00:00:00").getTime();
  return Math.max(0, Math.round((now - then) / 86400000));
}

/**
 * Generate a roast (Claude if reachable, local otherwise). Fires an OS
 * notification when permitted; always returns the text for in-app display.
 */
export async function fireRoast(
  state: AppState,
  avoid?: string
): Promise<{ text: string; shown: boolean }> {
  let text = localRoast(state);
  try {
    const res = await fetch("/api/notify", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        streak: state.streak.current,
        level: Math.max(1, Math.floor(state.xp / 200) + 1),
        dueCount: dueCards(state, state.lang).length,
        daysSince: daysSince(state.streak.lastActive),
        lang: state.lang,
        avoid,
      }),
    });
    if (res.ok) {
      const j = await res.json();
      if (j?.roast) text = j.roast;
    }
  } catch {
    /* keep local roast */
  }

  let shown = false;
  if (notifyAvailable() && Notification.permission === "granted") {
    try {
      new Notification("langlang 😈", { body: text, tag: "langlang-menace" });
      shown = true;
    } catch {
      /* ignore */
    }
  }
  return { text, shown };
}
