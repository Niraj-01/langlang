"use client";

// Cloud sync — local-first, Supabase behind it. The store never waits on the
// network: on login we pull the cloud copy and keep whichever save earned
// more XP; afterwards every local change is debounced and pushed up.
// Without env vars (or offline) all of this silently no-ops.

import { supabase } from "./supabase";
import { getState, replaceState, subscribeApp } from "./store";
import type { AppState } from "./types";

let started = false;
let userId: string | null = null;
let suppress = false; // true while applying a pulled state — don't re-push it
let pushTimer: ReturnType<typeof setTimeout> | null = null;

export type SyncStatus = "off" | "signed-out" | "syncing" | "synced" | "error";
let status: SyncStatus = "off";
const statusListeners = new Set<() => void>();

function setStatus(s: SyncStatus) {
  status = s;
  for (const l of statusListeners) l();
}
export function getSyncStatus(): SyncStatus {
  return status;
}
export function subscribeSyncStatus(cb: () => void) {
  statusListeners.add(cb);
  return () => {
    statusListeners.delete(cb);
  };
}

// conflict rule: the save that earned more XP wins (ties → cloud copy)
function pickWinner(local: AppState, remote: AppState): AppState {
  return local.xp > remote.xp ? local : remote;
}

async function pull() {
  const sb = supabase();
  if (!sb || !userId) return;
  setStatus("syncing");
  const { data, error } = await sb
    .from("user_state")
    .select("state")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) {
    setStatus("error");
    return;
  }
  const local = getState();
  if (data?.state) {
    const winner = pickWinner(local, data.state as AppState);
    suppress = true;
    replaceState(winner);
    suppress = false;
    if (winner === local) {
      await pushNow(); // local was ahead — publish it
      return;
    }
  } else {
    await pushNow(); // first login: seed the cloud with the local save
    return;
  }
  setStatus("synced");
}

async function pushNow() {
  const sb = supabase();
  if (!sb || !userId) return;
  setStatus("syncing");
  const { error } = await sb.from("user_state").upsert({
    user_id: userId,
    state: getState(),
    updated_at: new Date().toISOString(),
  });
  setStatus(error ? "error" : "synced");
}

function schedulePush() {
  if (!userId || suppress) return;
  if (pushTimer) clearTimeout(pushTimer);
  pushTimer = setTimeout(() => void pushNow(), 2500);
}

/** Idempotent. Call once on the client; wires auth → pull and store → push. */
export function startSync() {
  if (started || typeof window === "undefined") return;
  started = true;
  const sb = supabase();
  if (!sb) return; // no env vars — stay fully local
  setStatus("signed-out");
  sb.auth.onAuthStateChange((_event, session) => {
    const next = session?.user?.id ?? null;
    const wasSignedOut = !userId;
    userId = next;
    if (!next) setStatus("signed-out");
    else if (wasSignedOut) void pull();
  });
  subscribeApp(schedulePush);
}
