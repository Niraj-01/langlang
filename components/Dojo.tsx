"use client";

// AI Conversation Dojo: pick a scenario, survive the conversation in the
// target language, get corrected only AFTER the session. Voice-first with
// text always available. Every mistake can become an FSRS card.

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Icon } from "./Icon";
import { motion } from "framer-motion";
import { scenariosFor, type Scenario } from "@/data/scenarios";
import type { DojoReport } from "@/app/api/dojo/report/route";
import { useApp, addMistakeCard, awardXp, bumpQuest } from "@/lib/store";
import { speak as tts, sfxAdd, sfxCorrect, setMuted } from "@/lib/audio";
import { startRecognition, sttAvailable, type Recognizer } from "@/lib/speech";
import { burst } from "@/lib/confetti";

interface Turn {
  role: "user" | "assistant";
  content: string;
}

type Phase = "pick" | "chat" | "report";

export function Dojo() {
  const state = useApp();
  const [mounted, setMounted] = useState(false);
  const [phase, setPhase] = useState<Phase>("pick");
  const [scenario, setScenario] = useState<Scenario | null>(null);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recording, setRecording] = useState(false);
  const [report, setReport] = useState<DojoReport | null>(null);
  const [reportBusy, setReportBusy] = useState(false);
  const [added, setAdded] = useState<Set<number>>(new Set());
  const recognizer = useRef<Recognizer | null>(null);
  const scroller = useRef<HTMLDivElement>(null);

  useEffect(() => setMounted(true), []);
  useEffect(() => setMuted(!state.sound), [state.sound]);
  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: "smooth" });
  }, [turns, busy]);
  useEffect(() => () => recognizer.current?.abort(), []);

  if (!mounted) return <div className="lang-ja h-dvh bg-bg" />;

  const lang = state.lang;
  const accentClass = lang === "ja" ? "lang-ja" : "lang-de";
  const exchanges = turns.filter((t) => t.role === "user").length;

  const start = (s: Scenario) => {
    setScenario(s);
    setTurns([]);
    setReport(null);
    setAdded(new Set());
    setError(null);
    setPhase("chat");
    tts(s.opener, s.lang);
  };

  const send = async (text: string) => {
    if (!text.trim() || !scenario || busy) return;
    setError(null);
    const next: Turn[] = [...turns, { role: "user", content: text.trim() }];
    setTurns(next);
    setDraft("");
    setBusy(true);
    try {
      const res = await fetch("/api/dojo", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ scenarioId: scenario.id, messages: next }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(
          json.error === "no_api_key"
            ? "The Dojo needs a Claude API key: add ANTHROPIC_API_KEY to .env.local and restart."
            : "The Dojo hit a network snag — try that line again."
        );
        setTurns(turns); // roll back the unsent turn
        return;
      }
      setTurns([...next, { role: "assistant", content: json.reply }]);
      tts(json.reply, scenario.lang);
    } catch {
      setError("The Dojo is unreachable — check your connection.");
      setTurns(turns);
    } finally {
      setBusy(false);
    }
  };

  const startRec = () => {
    if (recording || busy) return;
    const rec = startRecognition(
      lang,
      (interim) => setDraft(interim),
      (final) => {
        setRecording(false);
        setDraft(final);
        if (final.trim()) void send(final);
      },
      () => setRecording(false)
    );
    if (rec) {
      recognizer.current = rec;
      setRecording(true);
    }
  };

  const endSession = async () => {
    if (!scenario) return;
    recognizer.current?.abort();
    setPhase("report");
    if (exchanges === 0) return;
    setReportBusy(true);
    const xp = exchanges * 10;
    awardXp(xp);
    bumpQuest("exchanges", exchanges, "max");
    sfxCorrect(exchanges);
    burst(innerWidth / 2, innerHeight / 3);
    try {
      const res = await fetch("/api/dojo/report", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ scenarioId: scenario.id, messages: turns }),
      });
      if (res.ok) setReport(await res.json());
      else setError("Couldn't generate the debrief — the conversation still counted.");
    } catch {
      setError("Couldn't generate the debrief — the conversation still counted.");
    } finally {
      setReportBusy(false);
    }
  };

  const addMistake = (i: number) => {
    if (!report || !scenario || added.has(i)) return;
    const m = report.mistakes[i];
    addMistakeCard(scenario.lang, m);
    sfxAdd();
    setAdded(new Set(added).add(i));
  };

  return (
    <div className={`${accentClass} flex h-dvh flex-col bg-bg`}>
      {/* header */}
      <div className="flex items-center justify-between border-b-2 border-line p-3">
        <Link href="/reels" className="hud-chip">
          ← FEED
        </Link>
        <div className="font-display text-sm uppercase tracking-[0.3em] text-(--accent)">
          {phase === "pick" ? "Conversation Dojo" : scenario?.title}
        </div>
        {phase === "chat" ? (
          <button className="hud-chip text-bad" onClick={endSession}>
            END ⏹
          </button>
        ) : (
          <div className="hud-chip opacity-60">{lang === "ja" ? "日本語" : "DEUTSCH"}</div>
        )}
      </div>

      {phase === "pick" && (
        <div className="flex-1 overflow-y-auto p-4">
          <div className="rise mb-4 text-sm opacity-60">
            Survive a conversation in {lang === "ja" ? "Japanese" : "German"}. No corrections
            mid-fight — the debrief comes after. Your mistakes become your deck.
          </div>
          <div className="stagger grid grid-cols-1 gap-3">
            {scenariosFor(lang).map((s) => (
              <motion.button
                key={s.id}
                whileTap={{ scale: 0.97 }}
                className="tile group p-4 text-left"
                onClick={() => start(s)}
              >
                <div className="flex items-center gap-3">
                  <span className="text-(--accent) transition-transform duration-200 group-hover:scale-125 group-hover:-rotate-6">
                    <Icon name="chat" size={34} />
                  </span>
                  <div>
                    <div className="font-display text-lg">{s.title}</div>
                    <div className="mt-1 text-sm opacity-60">{s.setting}</div>
                    <div className="mt-1 text-[10px] uppercase tracking-widest text-(--accent)">
                      {s.level} · you play {s.userRole}
                    </div>
                  </div>
                </div>
              </motion.button>
            ))}
          </div>
        </div>
      )}

      {phase === "chat" && scenario && (
        <>
          <div ref={scroller} className="flex-1 space-y-3 overflow-y-auto p-4">
            <Bubble role="assistant" lang={lang} text={scenario.opener} sub={scenario.openerMeaning} />
            {turns.map((t, i) => (
              <Bubble key={i} role={t.role} lang={lang} text={t.content} />
            ))}
            {busy && (
              <div className="animate-pulse pl-2 text-sm opacity-40">…</div>
            )}
            {error && (
              <div className="border-2 border-bad p-3 text-sm text-bad">{error}</div>
            )}
          </div>
          <div className="border-t-2 border-line p-3">
            <div className="mb-2 text-center text-[10px] uppercase tracking-[0.3em] opacity-40">
              {exchanges} exchange{exchanges === 1 ? "" : "s"} survived
            </div>
            <form
              className="flex gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                void send(draft);
              }}
            >
              {sttAvailable() && (
                <motion.button
                  type="button"
                  whileTap={{ scale: 0.9 }}
                  className={`btn-primary !px-4 !py-3 select-none ${recording ? "animate-pulse" : ""}`}
                  onPointerDown={startRec}
                  onPointerUp={() => recognizer.current?.stop()}
                  onPointerLeave={() => recognizer.current?.stop()}
                  onContextMenu={(e) => e.preventDefault()}
                  aria-label="Hold to speak"
                >
                  <Icon name="mic" size={18} />
                </motion.button>
              )}
              <input
                className={`min-w-0 flex-1 border-4 border-line bg-black/30 px-3 py-3 text-lg outline-none focus:border-(--accent) ${lang === "ja" ? "font-jp" : ""}`}
                placeholder={recording ? "listening…" : "say something…"}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                disabled={busy}
              />
              <button className="btn-ghost !px-4 !py-3" disabled={busy || !draft.trim()} aria-label="Send">
                <Icon name="arrowRight" size={18} />
              </button>
            </form>
          </div>
        </>
      )}

      {phase === "report" && scenario && (
        <div className="flex-1 overflow-y-auto p-4">
          <div className="rise mb-1 font-display text-2xl text-(--accent)">DEBRIEF</div>
          <div className="rise mb-4 text-sm opacity-60" style={{ "--rise-delay": "0.08s" } as React.CSSProperties}>
            {exchanges} exchange{exchanges === 1 ? "" : "s"} · +{exchanges * 10} XP
          </div>

          {exchanges === 0 && (
            <div className="opacity-60">You dipped before saying anything. The boss remains undefeated.</div>
          )}

          {reportBusy && (
            <div className="animate-pulse py-8 text-center text-sm uppercase tracking-[0.3em] opacity-50">
              sensei is reviewing the tape…
            </div>
          )}

          {error && <div className="mb-4 border-2 border-bad p-3 text-sm text-bad">{error}</div>}

          {report && report.wins.length > 0 && (
            <div className="mb-4 border-2 border-good p-3">
              <div className="mb-1 text-[10px] uppercase tracking-widest text-good">what landed</div>
              {report.wins.map((w, i) => (
                <div key={i} className="flex items-center gap-1.5 text-sm">
                  <Icon name="check" size={13} className="text-good" /> {w}
                </div>
              ))}
            </div>
          )}

          {report &&
            report.mistakes.map((m, i) => (
              <div
                key={i}
                className="rise mb-3 border-2 border-line bg-panel p-3"
                style={{ "--rise-delay": `${Math.min(i, 6) * 0.08}s` } as React.CSSProperties}
              >
                <div className="text-[10px] uppercase tracking-widest opacity-40">you said</div>
                <div className={`text-lg line-through opacity-70 ${lang === "ja" ? "font-jp" : ""}`}>
                  {m.youSaid}
                </div>
                <div className="mt-2 text-[10px] uppercase tracking-widest text-(--accent)">
                  a native says
                </div>
                <div className={`text-lg ${lang === "ja" ? "font-jp" : ""}`}>{m.nativeSays}</div>
                {m.reading && state.furigana && (
                  <div className="font-jp text-xs opacity-50">{m.reading}</div>
                )}
                <div className="mt-1 text-sm italic opacity-60">{m.meaning}</div>
                <div className="mt-2 text-sm opacity-80">{m.why}</div>
                <button
                  className={`mt-3 w-full border-4 py-2 font-display text-sm uppercase tracking-wider ${
                    added.has(i)
                      ? "border-good text-good"
                      : "border-(--accent) text-(--accent) active:scale-95"
                  }`}
                  onClick={() => addMistake(i)}
                >
                  {added.has(i) ? "IN YOUR DECK" : "+ ADD TO DECK"}
                </button>
              </div>
            ))}

          {report && report.mistakes.length === 0 && !reportBusy && (
            <div className="border-2 border-good p-4 text-good">
              Flawless. Not a single correction. Go touch grass, champion.
            </div>
          )}

          <div className="mt-6 grid grid-cols-2 gap-3 pb-8">
            <button className="btn-ghost" onClick={() => setPhase("pick")}>
              REMATCH
            </button>
            <Link href="/reels" className="btn-primary text-center">
              BACK TO FEED
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

function Bubble({
  role,
  lang,
  text,
  sub,
}: {
  role: "user" | "assistant";
  lang: "ja" | "de";
  text: string;
  sub?: string;
}) {
  const isUser = role === "user";
  return (
    <motion.div
      initial={{ opacity: 0, y: 12, x: isUser ? 16 : -16 }}
      animate={{ opacity: 1, y: 0, x: 0 }}
      transition={{ type: "spring", stiffness: 380, damping: 28 }}
      className={`flex ${isUser ? "justify-end" : "justify-start"}`}
    >
      <button
        onClick={() => !isUser && tts(text, lang)}
        className={`press max-w-[80%] border-2 p-3 text-left ${
          isUser ? "border-(--accent) bg-black/20" : "border-line bg-panel"
        }`}
        style={{ boxShadow: "3px 3px 0 rgba(0,0,0,0.4)" }}
      >
        <div className={`text-lg ${lang === "ja" ? "font-jp" : ""}`}>{text}</div>
        {sub && <div className="mt-1 text-xs italic opacity-50">{sub}</div>}
      </button>
    </motion.div>
  );
}
