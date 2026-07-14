// The offline shell must list every real route. It used to be hand-maintained
// and had silently drifted 10 routes behind (the whole German zone, /league,
// /radicals, /onboarding) — the app promised offline support and delivered a
// 404. `npm run gen:sw` regenerates it; this test fails the build if someone
// adds a route without regenerating.

import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const EXCLUDE = new Set(["/reels-design"]); // design reference, intentionally not cached

function routes(dir = "app", segments: string[] = []): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) {
      if (name.startsWith("[") || name.startsWith("@") || name.startsWith("_")) continue;
      const isGroup = name.startsWith("(") && name.endsWith(")");
      out.push(...routes(full, isGroup ? segments : [...segments, name]));
    } else if (name === "page.tsx") {
      out.push("/" + segments.join("/"));
    }
  }
  return out;
}

const sw = readFileSync("public/sw.js", "utf8");
const shell: string[] = JSON.parse(
  sw.match(/const SHELL = (\[[\s\S]*?\]);/)![1].replace(/,(\s*])/, "$1")
);

describe("service worker offline shell", () => {
  it("caches every app route (run `npm run gen:sw` if this fails)", () => {
    const expected = [...new Set(routes())].filter((r) => !EXCLUDE.has(r));
    const missing = expected.filter((r) => !shell.includes(r));
    expect(missing, `routes missing from the offline shell: ${missing.join(", ")}`).toEqual([]);
  });

  it("caches the PWA manifest and icon", () => {
    expect(shell).toContain("/manifest.json");
    expect(shell).toContain("/icon.svg");
  });

  it("never caches API routes (they must always hit the network)", () => {
    expect(shell.filter((r) => r.startsWith("/api"))).toEqual([]);
    expect(sw).toContain('url.pathname.startsWith("/api/")');
  });

  it("versions the cache so a shell change evicts the old one", () => {
    expect(sw).toMatch(/const CACHE = "langlang-[0-9a-f]{8}";/);
  });
});
