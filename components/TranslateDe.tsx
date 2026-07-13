"use client";

// German translation component — mirrors Translate.tsx but for English ⇄ German.
// Calls /api/translate-de and uses speakDe for TTS.

import { useState } from "react";
import { motion } from "framer-motion";
import { speakDe, canSpeak } from "@/lib/speak";
import { Icon } from "./Icon";
import { useMounted } from "@/lib/useMounted";

interface TranslationDe {
  german: string;
  english: string;
}

const EXAMPLES = [
  "How are you?",
  "Where is the train station?",
  "How much is this?",
  "Thank you very much",
  "I would like a coffee",
  "I don't speak German well",
];

export function TranslateDe() {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<TranslationDe | null>(null);
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
      const res = await fetch("/api/translate-de", {
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
      speakDe(json.german);
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
        placeholder="Type English or German…"
        className="rise h-24 w-full rounded-xl border border-line bg-surface p-3 text-lg outline-none transition-shadow placeholder:text-muted focus:border-accent focus:shadow-[0_0_0_3px] focus:shadow-accent/20"
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
            onClick={() => speakDe(result.german)}
            className="text-left text-2xl font-bold leading-snug hover:text-accent"
          >
            <span className="inline-flex items-center gap-2">{result.german} {speech && <Icon name="sound" size={17} />}</span>
          </button>
          <div className="mt-2 border-t border-line pt-2 text-base text-muted">{result.english}</div>
        </motion.div>
      )}
    </div>
  );
}
