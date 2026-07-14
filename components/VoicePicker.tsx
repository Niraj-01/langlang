"use client";

// Voice picker. Browser TTS quality swings wildly between installed voices —
// the scored default in lib/audio picks the best it can find, but the user's
// ear beats our heuristic, so let them choose and hear it. Falls back to
// "Automatic" (the scored pick) and hides itself entirely where TTS is absent.

import { useEffect, useState } from "react";
import type { Lang } from "@/lib/types";
import { listVoices, getVoicePref, setVoicePref, speak } from "@/lib/audio";
import { Icon } from "./Icon";

const SAMPLE: Record<Lang, string> = {
  ja: "こんにちは。水をください。",
  de: "Hallo. Ein Glas Wasser, bitte.",
};

export function VoicePicker({ lang }: { lang: Lang }) {
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [pref, setPref] = useState<string | null>(null);

  useEffect(() => {
    // voices populate asynchronously on most browsers
    const load = () => {
      setVoices(listVoices(lang));
      setPref(getVoicePref(lang));
    };
    load();
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.addEventListener("voiceschanged", load);
      return () => window.speechSynthesis.removeEventListener("voiceschanged", load);
    }
  }, [lang]);

  if (voices.length === 0) {
    return (
      <div className="border-2 border-line bg-panel p-4 text-sm opacity-60">
        No {lang === "ja" ? "Japanese" : "German"} voice is installed on this device, so audio is
        unavailable here. Adding one in your OS speech settings enables it.
      </div>
    );
  }

  const choose = (uri: string) => {
    const next = uri === "auto" ? null : uri;
    setVoicePref(lang, next);
    setPref(next);
    speak(SAMPLE[lang], lang);
  };

  return (
    <div className="border-2 border-line bg-panel p-4">
      <div className="flex items-center gap-2">
        <select
          value={pref ?? "auto"}
          onChange={(e) => choose(e.target.value)}
          className="min-w-0 flex-1 border-2 border-line bg-black/30 px-2 py-2 text-sm outline-none focus:border-(--accent)"
          aria-label={`${lang === "ja" ? "Japanese" : "German"} voice`}
        >
          <option value="auto">Automatic (best available)</option>
          {voices.map((v) => (
            <option key={v.voiceURI} value={v.voiceURI}>
              {v.name}
              {v.localService ? "" : " · online"}
            </option>
          ))}
        </select>
        <button
          onClick={() => speak(SAMPLE[lang], lang)}
          className="hud-chip gap-1.5 shrink-0"
          aria-label="Hear a sample"
        >
          <Icon name="sound" size={14} /> Test
        </button>
      </div>
      <div className="mt-2 text-[10px] uppercase tracking-widest opacity-40">
        {voices.length} {lang === "ja" ? "Japanese" : "German"} voice
        {voices.length === 1 ? "" : "s"} on this device
      </div>
    </div>
  );
}
