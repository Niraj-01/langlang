"use client";

import { useEffect, useState } from "react";

// True only after the first client render — use to gate client-only UI
// (like Web Speech buttons) so SSR and hydration markup match.
export function useMounted(): boolean {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted;
}
