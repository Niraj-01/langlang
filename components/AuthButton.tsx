"use client";

// Google sign-in via Supabase. Renders as a compact header chip ("chip") or
// a full account panel ("panel", used in Profile). When Supabase env vars
// are absent it shows the old "login soon" placeholder — nothing breaks.

import { useEffect, useState, useSyncExternalStore } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { getSyncStatus, subscribeSyncStatus, startSync } from "@/lib/sync";

const STATUS_LABEL: Record<string, string> = {
  syncing: "syncing…",
  synced: "progress synced",
  error: "sync error — will retry on next change",
};

export function AuthButton({ variant = "chip" }: { variant?: "chip" | "panel" }) {
  const sb = supabase();
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);
  const status = useSyncExternalStore(subscribeSyncStatus, getSyncStatus, () => "off" as const);

  useEffect(() => {
    startSync();
    if (!sb) return;
    void sb.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null);
      setReady(true);
    });
    const { data: sub } = sb.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null);
      setReady(true);
    });
    return () => sub.subscription.unsubscribe();
  }, [sb]);

  const signIn = () =>
    sb?.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin },
    });
  const signOut = () => sb?.auth.signOut();

  if (variant === "chip") {
    if (!sb)
      return (
        <button
          type="button"
          disabled
          title="Accounts & sync are coming soon"
          className="hidden border-2 border-line px-3 py-1.5 font-display text-xs uppercase opacity-40 sm:block"
        >
          Login soon
        </button>
      );
    return user ? (
      <button
        type="button"
        onClick={signOut}
        title={`Signed in as ${user.email ?? "Google user"} — click to sign out`}
        className="press hidden items-center gap-2 border-2 border-line px-3 py-1.5 font-display text-xs uppercase transition-colors hover:border-(--accent) sm:flex"
      >
        <span className="text-(--accent)">●</span>
        {(user.email ?? "account").split("@")[0]}
      </button>
    ) : (
      <button
        type="button"
        onClick={signIn}
        disabled={!ready}
        className="press hidden border-2 border-line px-3 py-1.5 font-display text-xs uppercase transition-colors hover:border-(--accent) hover:text-(--accent) sm:block"
      >
        Sign in
      </button>
    );
  }

  // panel (Profile)
  if (!sb)
    return (
      <div className="border-2 border-line bg-panel p-4 text-sm opacity-50">
        Cloud sync isn&apos;t configured on this deployment — progress stays on this
        device.
      </div>
    );

  return (
    <div className="border-2 border-line bg-panel p-4">
      {user ? (
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="truncate text-sm">{user.email ?? "Google account"}</div>
            <div className="text-[10px] uppercase tracking-widest text-(--accent)">
              {STATUS_LABEL[status] ?? "connected"}
            </div>
          </div>
          <button className="btn-ghost !py-2 !text-xs" onClick={signOut}>
            Sign out
          </button>
        </div>
      ) : (
        <div className="flex items-center justify-between gap-3">
          <div className="pr-2 text-sm opacity-70">
            Sign in to back up your streak, deck and pet — and pick them up on any
            device.
          </div>
          <button className="btn-primary shrink-0 !py-2 !text-sm" onClick={signIn} disabled={!ready}>
            <span className="mr-1.5 inline-block rounded-full bg-black/20 px-1.5">G</span>
            Sign in
          </button>
        </div>
      )}
    </div>
  );
}
