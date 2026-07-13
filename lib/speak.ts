"use client";

// Pronunciation helpers for the reference (Learn) zones. Delegates to the
// shared voice picker in lib/audio.ts so both zones use the best-available
// native voice. Feature-detects; silently no-ops where unsupported.

import { speak } from "./audio";

export function canSpeak(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

export function speakJa(text: string, rate = 0.9) {
  speak(text, "ja", rate);
}

export function speakDe(text: string, rate = 0.95) {
  speak(text, "de", rate);
}
