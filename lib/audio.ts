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

// Known good native voices per platform (Apple / Google / Microsoft), best first.
const GOOD_NAMES: Record<Lang, RegExp> = {
  ja: /kyoko|otoya|o-ren|hattori|google\s*日本語|nanami|ayumi|haruka|ichiro/i,
  de: /anna|petra|markus|yannick|google\s*deutsch|katja|conrad|hedda|amala/i,
};

/** Score a voice for learner quality — higher is better. */
function scoreVoice(v: SpeechSynthesisVoice, lang: Lang): number {
  const name = v.name;
  let s = 0;
  if (GOOD_NAMES[lang].test(name)) s += 6;
  if (/neural|natural|premium|enhanced|siri/i.test(name)) s += 4;
  if (/google/i.test(name)) s += 3; // Google voices are consistently clear
  if (/compact|espeak|festival|robo/i.test(name)) s -= 6; // tinny fallbacks
  if (v.localService) s += 1; // no network hiccup mid-scroll
  if (v.default) s += 1;
  return s;
}

/** Every installed voice for a language, best-scoring first (for the picker). */
export function listVoices(lang: Lang): SpeechSynthesisVoice[] {
  const code = BCP47[lang].toLowerCase();
  return voices
    .filter((v) => v.lang.replace("_", "-").toLowerCase().startsWith(code))
    .sort((a, b) => scoreVoice(b, lang) - scoreVoice(a, lang));
}

// A user's explicit voice choice beats our scoring. Kept in its own localStorage
// key rather than AppState so lib/audio stays free of a store dependency (and
// so a voice that only exists on this device never syncs to another one).
const VOICE_KEY = "langlang.voice";

function loadPrefs(): Partial<Record<Lang, string>> {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(VOICE_KEY) ?? "{}");
  } catch {
    return {};
  }
}
let prefs: Partial<Record<Lang, string>> = loadPrefs();

export function getVoicePref(lang: Lang): string | null {
  return prefs[lang] ?? null;
}

/** Pass null to fall back to automatic (scored) selection. */
export function setVoicePref(lang: Lang, voiceURI: string | null) {
  prefs = { ...prefs, [lang]: voiceURI ?? undefined };
  if (voiceURI === null) delete prefs[lang];
  try {
    localStorage.setItem(VOICE_KEY, JSON.stringify(prefs));
  } catch {
    /* storage full — the choice just won't persist */
  }
}

function pickVoice(lang: Lang): SpeechSynthesisVoice | null {
  const available = listVoices(lang);
  if (available.length === 0) return null;
  const chosen = prefs[lang];
  // an explicitly chosen voice wins, but only while it's still installed
  return (chosen && available.find((v) => v.voiceURI === chosen)) || available[0];
}

export { pickVoice };

// Slightly slower for Japanese — dense kana benefits from a beat more space.
const DEFAULT_RATE: Record<Lang, number> = { ja: 0.9, de: 0.95 };

export function speak(text: string, lang: Lang, rate?: number) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = BCP47[lang];
  const v = pickVoice(lang);
  if (v) u.voice = v;
  u.rate = rate ?? DEFAULT_RATE[lang];
  u.pitch = 1;
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
