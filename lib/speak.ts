"use client";

// Japanese pronunciation for the reference (Learn) zone. Delegates to the
// shared voice picker in lib/audio.ts so both zones use the same best-available
// ja-JP voice. Feature-detects; silently no-ops where unsupported.

import { speak } from "./audio";

export function canSpeak(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

export function speakJa(text: string, rate = 0.9) {
  speak(text, "ja", rate);
}
