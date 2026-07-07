// Server-side Claude client (API routes only).
// Auth resolves from env (ANTHROPIC_API_KEY / ANTHROPIC_AUTH_TOKEN) or an
// `ant auth login` profile — no key handling here.

import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";

// Spec pins claude-sonnet-4-6 for in-app AI; override via env (e.g.
// LANGLANG_MODEL=claude-fable-5 or claude-opus-4-8) if desired.
export const MODEL = process.env.LANGLANG_MODEL ?? "claude-sonnet-4-6";

// Fable/Mythos always think — an explicit `thinking:{type:"disabled"}` 400s,
// so "off" must omit the param entirely on those models.
const ALWAYS_THINKS = /^claude-(fable|mythos)/.test(MODEL);

/**
 * Model-agnostic thinking config. Use `...think("off")` for latency-sensitive
 * one-liners and `...think("adaptive")` for reasoning-heavy calls, so the app
 * runs unchanged across Sonnet, Opus, and Fable.
 */
export function think(mode: "off" | "adaptive"): Record<string, unknown> {
  if (mode === "adaptive") return { thinking: { type: "adaptive" } };
  return ALWAYS_THINKS ? {} : { thinking: { type: "disabled" } };
}

let client: Anthropic | null = null;

export function claude(): Anthropic {
  if (!client) client = new Anthropic();
  return client;
}

/** Map SDK errors to a JSON response the client can degrade on. */
export function claudeErrorResponse(err: unknown): NextResponse {
  // missing credentials throws a plain Error at client construction
  const missingKey =
    err instanceof Error && /ANTHROPIC_API_KEY|apiKey|auth/i.test(err.message);
  if (err instanceof Anthropic.AuthenticationError || (missingKey && !(err instanceof Anthropic.APIError))) {
    return NextResponse.json(
      {
        error: "no_api_key",
        hint: "Set ANTHROPIC_API_KEY in .env.local (or `ant auth login`) and restart the dev server.",
      },
      { status: 503 }
    );
  }
  if (err instanceof Anthropic.RateLimitError) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }
  if (err instanceof Anthropic.APIError) {
    return NextResponse.json(
      { error: "api_error", detail: err.message },
      { status: 502 }
    );
  }
  return NextResponse.json({ error: "unknown" }, { status: 500 });
}

export function textOf(response: Anthropic.Message): string {
  return response.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("");
}

/** Parse JSON out of a model reply, tolerating code fences. */
export function parseJson<T>(raw: string): T | null {
  const stripped = raw
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```\s*$/, "")
    .trim();
  const start = stripped.indexOf("{");
  const end = stripped.lastIndexOf("}");
  if (start === -1 || end === -1) return null;
  try {
    return JSON.parse(stripped.slice(start, end + 1)) as T;
  } catch {
    return null;
  }
}
