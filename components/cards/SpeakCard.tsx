"use client";

// Shadowing rep: hear the sentence, hold the mic, say it back.
// Scored locally (Levenshtein) so it works offline; Claude adds one
// coaching line when the API is reachable. Falls back to typing when
// SpeechRecognition isn't available.

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import type { Lang, SpeakTarget } from "@/lib/types";
import { recordSpeak } from "@/lib/store";
import { speak as tts, sfxCorrect, sfxWrong } from "@/lib/audio";
import { startRecognition, sttAvailable, type Recognizer } from "@/lib/speech";
import { shadowScore, scoreGrade } from "@/lib/similarity";
import { burst } from "@/lib/confetti";
import { XpPop } from "./XpPop";

export function SpeakCard({
  lang,
  target,
  furigana,
  combo,
  multiplier,
  onAnswered,
}: {
  lang: Lang;
  target: SpeakTarget;
  furigana: boolean;
  combo: number;
  multiplier: number;
  onAnswered: (correct: boolean) => void;
}) {
  const [recording, setRecording] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [typed, setTyped] = useState("");
  const [result, setResult] = useState<{ score: number; label: string; pass: boolean } | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [xp, setXp] = useState<number | null>(null);
  const [attempt, setAttempt] = useState(0);
  const recognizer = useRef<Recognizer | null>(null);
  const done = useRef(false);
  const hasStt = sttAvailable();

  useEffect(() => () => recognizer.current?.abort(), []);

  const finish = (saidText: string) => {
    if (done.current) return;
    const score = shadowScore(saidText, target.sentence, lang, target.reading);
    const grade = scoreGrade(score);
    setResult({ score, ...grade });

    if (grade.pass) {
      done.current = true;
      const earned = (score >= 90 ? 20 : 12) * multiplier;
      recordSpeak(true, earned);
      setXp(earned);
      sfxCorrect(combo);
      burst(innerWidth / 2, innerHeight / 2, undefined, score >= 90 ? 90 : 50);
      onAnswered(true);
    } else if (attempt >= 1) {
      // second miss: move on, small consolation XP, breaks combo
      done.current = true;
      recordSpeak(false, 3);
      setXp(3);
      sfxWrong();
      onAnswered(false);
    } else {
      sfxWrong();
      setAttempt(1);
    }

    // Claude coaching line — fire and forget, card already resolved
    fetch("/api/speak", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ lang, target: target.sentence, transcript: saidText, score }),
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => j?.feedback && setFeedback(j.feedback))
      .catch(() => {});
  };

  const startRec = () => {
    if (done.current || recording) return;
    setTranscript("");
    setFeedback(null);
    const rec = startRecognition(
      lang,
      (interim) => setTranscript(interim),
      (final) => {
        setRecording(false);
        setTranscript(final);
        finish(final);
      },
      () => setRecording(false)
    );
    if (rec) {
      recognizer.current = rec;
      setRecording(true);
    }
  };

  const stopRec = () => {
    if (recording) recognizer.current?.stop();
  };

  return (
    <div className="card-shell">
      <div className="card-panel">
        <div className="tag">SPEAK · SHADOW IT</div>

        <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
          <button onClick={() => tts(target.sentence, lang)} className="group">
            <div className={`text-3xl leading-relaxed ${lang === "ja" ? "font-jp" : ""}`}>
              {target.sentence}
            </div>
            {lang === "ja" && furigana && target.reading && (
              <div className="font-jp mt-2 text-base opacity-50">{target.reading}</div>
            )}
            <div className="mt-2 text-xs uppercase tracking-[0.3em] opacity-40 group-active:opacity-90">
              ▶ tap sentence to hear it
            </div>
          </button>
          {target.meaning && (
            <div className="text-sm italic opacity-60">{target.meaning}</div>
          )}

          {(transcript || result) && (
            <div className="w-full border-2 border-line bg-black/30 p-3">
              <div className="text-[10px] uppercase tracking-widest opacity-40">you said</div>
              <div className={`mt-1 text-lg ${lang === "ja" ? "font-jp" : ""}`}>
                {transcript || "…"}
              </div>
            </div>
          )}

          {result && (
            <motion.div
              initial={{ scale: 0.7, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className={`font-display text-2xl ${result.pass ? "text-good" : "text-bad"}`}
            >
              {result.score}% · {result.label}
            </motion.div>
          )}

          {feedback && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="border-l-4 border-(--accent) pl-3 text-left text-sm opacity-80"
            >
              {feedback}
            </motion.div>
          )}
        </div>

        {!done.current && hasStt && (
          <motion.button
            whileTap={{ scale: 0.92 }}
            className={`btn-primary select-none ${recording ? "animate-pulse" : ""}`}
            onPointerDown={startRec}
            onPointerUp={stopRec}
            onPointerLeave={stopRec}
            onContextMenu={(e) => e.preventDefault()}
          >
            {recording ? "● LISTENING — RELEASE WHEN DONE" : attempt > 0 ? "🎙 ONE MORE TRY" : "🎙 HOLD TO SPEAK"}
          </motion.button>
        )}

        {!done.current && !hasStt && (
          <form
            className="grid grid-cols-[1fr_auto] gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              if (!typed.trim()) return;
              setTranscript(typed);
              finish(typed);
              setTyped("");
            }}
          >
            <input
              className="border-4 border-line bg-black/30 px-3 py-3 text-lg outline-none focus:border-(--accent)"
              placeholder="no mic here — type it instead"
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
            />
            <button className="btn-primary !py-3">GO</button>
          </form>
        )}

        {done.current && (
          <div className="text-center text-sm uppercase tracking-[0.3em] opacity-50">
            {result?.pass ? "said like you meant it ↑" : "it'll come back around ↑"}
          </div>
        )}
      </div>
      <XpPop amount={xp} />
    </div>
  );
}
