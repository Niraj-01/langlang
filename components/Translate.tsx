"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import type { Translation } from "@/app/api/translate/route";
import { speakJa, canSpeak } from "@/lib/speak";
import { useMounted } from "@/lib/useMounted";

const EXAMPLES = [
  "How are you?",
  "Where is the station?",
  "How much is this?",
  "Thank you very much",
  "I would like some water",
  "I don't speak Japanese well",
];

export function Translate() {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Translation | null>(null);
  const [error, setError] = useState<string | null>(null);
  const speech = useMounted() && canSpeak();

  const run = async (input?: string) => {
    const q = (input ?? text).trim();
    if (!q || busy) return;
    if (input) setText(input);
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/translate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ text: q }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(
          json.error === "no_api_key"
            ? "Translation needs a Claude API key — add ANTHROPIC_API_KEY to .env.local and restart."
            : "Couldn't translate that — please try again."
        );
        return;
      }
      setResult(json);
      speakJa(json.japanese);
    } catch {
      setError("Network error — check your connection.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) run();
        }}
        placeholder="Type English or Japanese…"
        className="jp rise h-24 w-full rounded-xl border border-line bg-surface p-3 text-lg outline-none transition-shadow placeholder:font-sans placeholder:text-muted focus:border-accent focus:shadow-[0_0_0_3px] focus:shadow-accent/20"
      />
      <button
        onClick={() => run()}
        disabled={busy || !text.trim()}
        className={`press rise mt-2 w-full rounded-xl bg-accent py-3 font-semibold text-white shadow-[0_6px_20px_-6px] shadow-accent/50 transition hover:brightness-110 disabled:opacity-40 disabled:shadow-none ${
          busy ? "animate-pulse" : ""
        }`}
        style={{ "--rise-delay": "0.06s" } as React.CSSProperties}
      >
        {busy ? "Translating…" : "Translate ⇄"}
      </button>

      <div className="rise mt-3" style={{ "--rise-delay": "0.12s" } as React.CSSProperties}>
        <div className="mb-1.5 text-[11px] uppercase tracking-widest text-muted">Try one</div>
        <div className="flex flex-wrap gap-1.5">
          {EXAMPLES.map((e) => (
            <button
              key={e}
              onClick={() => run(e)}
              className="press rounded-full border border-line bg-surface px-3 py-1 text-xs text-muted transition hover:-translate-y-0.5 hover:border-accent hover:text-ink"
            >
              {e}
            </button>
          ))}
        </div>
      </div>

      {error && <div className="mt-4 rounded-xl border border-accent/40 bg-accent/5 p-3 text-sm text-accent">{error}</div>}

      {result && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-4 rounded-2xl border border-line bg-surface p-5"
        >
          <button
            onClick={() => speakJa(result.japanese)}
            className="jp text-left text-2xl leading-snug hover:text-accent"
          >
            {result.japanese} {speech && <span className="text-lg">🔊</span>}
          </button>
          <div className="romaji mt-2 text-base">{result.romaji}</div>
          <div className="mt-1 border-t border-line pt-2 text-base text-muted">{result.english}</div>
        </motion.div>
      )}
    </div>
  );
}
