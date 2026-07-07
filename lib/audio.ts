"use client";

// TTS (Web Speech API) + synthesized SFX (WebAudio) + haptics.
// Everything feature-detects; the app works silently without support.

import type { Lang } from "./types";

const BCP47: Record<Lang, string> = { ja: "ja-JP", de: "de-DE" };

let voices: SpeechSynthesisVoice[] = [];
if (typeof window !== "undefined" && "speechSynthesis" in window) {
  const loadVoices = () => {
    voices = window.speechSynthesis.getVoices();
  };
  loadVoices();
  window.speechSynthesis.onvoiceschanged = loadVoices;
}

function pickVoice(lang: Lang): SpeechSynthesisVoice | null {
  const code = BCP47[lang];
  const match = voices.filter((v) => v.lang.replace("_", "-").startsWith(code));
  // prefer non-default enhanced voices when present
  return (
    match.find((v) => /premium|enhanced|siri/i.test(v.name)) ?? match[0] ?? null
  );
}

export function speak(text: string, lang: Lang, rate = 0.95) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = BCP47[lang];
  const v = pickVoice(lang);
  if (v) u.voice = v;
  u.rate = rate;
  window.speechSynthesis.speak(u);
}

export function haptic(pattern: number | number[] = 15) {
  if (typeof navigator !== "undefined" && "vibrate" in navigator) {
    try {
      navigator.vibrate(pattern);
    } catch {
      /* unsupported */
    }
  }
}

// ---- SFX ----

let ctx: AudioContext | null = null;
let muted = false;

export function setMuted(m: boolean) {
  muted = m;
}

function audio(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const AC = window.AudioContext;
  if (!AC) return null;
  if (!ctx) ctx = new AC();
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

function blip(
  freq: number,
  time: number,
  duration: number,
  type: OscillatorType = "square",
  gain = 0.08
) {
  const ac = audio();
  if (!ac || muted) return;
  const osc = ac.createOscillator();
  const g = ac.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, ac.currentTime + time);
  g.gain.setValueAtTime(gain, ac.currentTime + time);
  g.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + time + duration);
  osc.connect(g).connect(ac.destination);
  osc.start(ac.currentTime + time);
  osc.stop(ac.currentTime + time + duration + 0.02);
}

/** Rising arpeggio; pitch climbs with combo. */
export function sfxCorrect(combo = 0) {
  const base = 440 * Math.pow(1.059, Math.min(combo, 12)); // up a semitone per combo
  blip(base, 0, 0.09);
  blip(base * 1.335, 0.07, 0.09);
  blip(base * 2, 0.14, 0.14, "square", 0.06);
  haptic(20);
}

export function sfxWrong() {
  blip(160, 0, 0.18, "sawtooth", 0.07);
  blip(110, 0.1, 0.25, "sawtooth", 0.07);
  haptic([40, 40, 40]);
}

export function sfxFlip() {
  blip(660, 0, 0.05, "triangle", 0.05);
  haptic(8);
}

export function sfxAdd() {
  blip(523, 0, 0.08, "triangle", 0.07);
  blip(784, 0.06, 0.12, "triangle", 0.07);
  haptic(15);
}

export function sfxBonus() {
  blip(523, 0, 0.08);
  blip(659, 0.07, 0.08);
  blip(784, 0.14, 0.08);
  blip(1047, 0.21, 0.2, "square", 0.07);
  haptic([20, 30, 60]);
}
