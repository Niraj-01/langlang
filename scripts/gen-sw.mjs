// Regenerates the service worker's offline SHELL from the actual app/ routes.
//
// The SHELL used to be hand-maintained and silently rotted: by the time this
// script was written it was missing 10 live routes (the whole German zone,
// /league, /radicals, /onboarding), so those pages 404'd offline even though
// the app advertises offline support. Runs on `prebuild`, so it cannot drift.

import { readdirSync, readFileSync, writeFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { createHash } from "node:crypto";

const APP = "app";
const SW = "public/sw.js";

// Routes deliberately kept OUT of the offline shell.
const EXCLUDE = new Set([
  "/reels-design", // static design reference, not a product surface
]);

// Non-route assets that must still be cached.
const EXTRA = ["/manifest.json", "/icon.svg"];

/** Walk app/ and collect the URL path of every page.tsx. */
function routes(dir = APP, segments = []) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) {
      // route groups like (reference) don't appear in the URL
      const isGroup = name.startsWith("(") && name.endsWith(")");
      // dynamic/parallel/private segments can't be prerendered into a shell
      if (name.startsWith("[") || name.startsWith("@") || name.startsWith("_")) continue;
      out.push(...routes(full, isGroup ? segments : [...segments, name]));
    } else if (name === "page.tsx" || name === "page.jsx") {
      out.push("/" + segments.join("/"));
    }
  }
  return out;
}

const found = [...new Set(routes())]
  .map((r) => (r === "/" ? "/" : r))
  .filter((r) => !EXCLUDE.has(r))
  .sort((a, b) => (a === "/" ? -1 : b === "/" ? 1 : a.localeCompare(b)));

const shell = [...found, ...EXTRA];

// Version the cache off the shell contents so a route change auto-evicts the
// stale cache on the next activate.
const version = createHash("sha256").update(shell.join("|")).digest("hex").slice(0, 8);

const src = readFileSync(SW, "utf8");
const next = src
  .replace(/const CACHE = "[^"]*";/, `const CACHE = "langlang-${version}";`)
  .replace(
    /const SHELL = \[[\s\S]*?\];/,
    "const SHELL = [\n" + shell.map((r) => `  ${JSON.stringify(r)},`).join("\n") + "\n];"
  );

if (next !== src) {
  writeFileSync(SW, next);
  console.log(`sw: shell updated -> langlang-${version} (${shell.length} entries)`);
} else {
  console.log(`sw: shell already current (langlang-${version}, ${shell.length} entries)`);
}
