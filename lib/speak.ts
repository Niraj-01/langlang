"use client";

// Free pronunciation via the browser's Web Speech API (ja-JP voice).
// Feature-detects; silently no-ops where unsupported.

let voices: SpeechSynthesisVoice[] = [];
if (typeof window !== "undefined" && "speechSynthesis" in window) {
  const load = () => (voices = window.speechSynthesis.getVoices());
  load();
  window.speechSynthesis.onvoiceschanged = load;
}

export function canSpeak(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

export function speakJa(text: string, rate = 0.9) {
  if (!canSpeak()) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = "ja-JP";
  const jp = voices.find((v) => v.lang.replace("_", "-").startsWith("ja"));
  if (jp) u.voice = jp;
  u.rate = rate;
  window.speechSynthesis.speak(u);
}
