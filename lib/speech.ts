"use client";

// Web Speech API STT wrapper. Feature-detects; callers must handle
// sttAvailable() === false with a text-input fallback.

import type { Lang } from "./types";

const BCP47: Record<Lang, string> = { ja: "ja-JP", de: "de-DE" };

type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

interface SpeechRecognitionLike {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  maxAlternatives: number;
  onresult: ((e: SpeechRecognitionEventLike) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}

interface SpeechRecognitionEventLike {
  resultIndex: number;
  results: ArrayLike<{ 0: { transcript: string }; isFinal: boolean }>;
}

function ctor(): SpeechRecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as Record<string, unknown>;
  return (
    (w.SpeechRecognition as SpeechRecognitionCtor | undefined) ??
    (w.webkitSpeechRecognition as SpeechRecognitionCtor | undefined) ??
    null
  );
}

export function sttAvailable(): boolean {
  return ctor() !== null;
}

export interface Recognizer {
  stop(): void;
  abort(): void;
}

/**
 * Start listening. Interim transcripts stream via onInterim; the final
 * combined transcript arrives via onFinal when recognition ends.
 */
export function startRecognition(
  lang: Lang,
  onInterim: (text: string) => void,
  onFinal: (text: string) => void,
  onError: (err: string) => void
): Recognizer | null {
  const C = ctor();
  if (!C) return null;
  const rec = new C();
  rec.lang = BCP47[lang];
  rec.interimResults = true;
  rec.continuous = true;
  rec.maxAlternatives = 1;

  let finalText = "";
  rec.onresult = (e) => {
    let interim = "";
    for (let i = e.resultIndex; i < e.results.length; i++) {
      const r = e.results[i];
      if (r.isFinal) finalText += r[0].transcript;
      else interim += r[0].transcript;
    }
    onInterim(finalText + interim);
  };
  rec.onerror = (e) => {
    if (e.error !== "aborted" && e.error !== "no-speech") onError(e.error);
  };
  rec.onend = () => onFinal(finalText.trim());
  try {
    rec.start();
  } catch {
    onError("start-failed");
    return null;
  }
  return {
    stop: () => rec.stop(),
    abort: () => rec.abort(),
  };
}
