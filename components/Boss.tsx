"use client";

// Boss battles: the level-cap fights. Survive N on-target exchanges (no
// falling back to English) to drain the boss's health and unlock the next.
// Damage is dealt client-side the instant you land a target-language line, so
// a boss is still beatable if the AI reply can't load — the win is yours, the
// witty in-character retort is the bonus.

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Icon } from "./Icon";
import { bossesFor, scenarioById, type Scenario } from "@/data/scenarios";
import { useApp, clearBoss } from "@/lib/store";
import { speak as tts, sfxCorrect, sfxWrong, sfxBonus } from "@/lib/audio";
import { startRecognition, sttAvailable, type Recognizer } from "@/lib/speech";
import { burst } from "@/lib/confetti";

interface Turn {
  role: "user" | "assistant";
  content: string;
}

function isTargetLang(text: string, lang: "ja" | "de"): boolean {
  const t = text.trim();
  if (!t) return false;
  if (lang === "ja") return /[぀-ヿ一-龯]/.test(t);
  const german = /[äöüßÄÖÜ]|\b(ich|du|sie|wir|der|die|das|und|nicht|ein|eine|ist|bitte|danke|haben|sein|möchte|kann|können|hallo|ja|nein|wie|was|wo|warum|weil|mit|für|auf)\b/i;
  const englishOnly = /\b(the|you|what|are|please|hello|thanks|sorry|yes|because|with|would|could)\b/i;
  if (german.test(t)) return true;
  if (englishOnly.test(t)) return false;
  return true; // benefit of the doubt
}

export function Boss() {
  const state = useApp();
  const [mounted, setMounted] = useState(false);
  const [boss, setBoss] = useState<Scenario | null>(null);

  useEffect(() => setMounted(true), []);
  if (!mounted) return <div className="lang-ja h-dvh bg-bg" />;

  const lang = state.lang;
  const accent = lang === "ja" ? "lang-ja" : "lang-de";

  if (boss) {
    return <Fight boss={boss} onExit={() => setBoss(null)} />;
  }

  const list = bossesFor(lang);
  return (
    <div className={`${accent} min-h-dvh bg-bg pb-10`}>
      <div className="flex items-center justify-between border-b-2 border-line p-3">
        <Link href="/reels" className="hud-chip">
          ← FEED
        </Link>
        <div className="font-display text-sm uppercase tracking-[0.3em] text-(--accent)">
          Boss Battles
        </div>
        <Link href="/dojo" className="hud-chip gap-1">
          <Icon name="torii" size={14} /> DOJO
        </Link>
      </div>

      <div className="p-4">
        <div className="rise mb-4 text-sm opacity-60">
          Each unit ends with a boss. Land {""}
          <span className="text-(--accent)">on-target exchanges</span> — no English — to
          drain their health and unlock the next fight. Winning earns a pack and a streak
          freeze.
        </div>
        <div className="stagger space-y-3">
          {list.map((b) => {
            const cleared = state.bossesCleared.includes(b.id);
            const locked = b.boss?.unlockAfter && !state.bossesCleared.includes(b.boss.unlockAfter);
            return (
              <button
                key={b.id}
                disabled={!!locked}
                onClick={() => !locked && setBoss(b)}
                className={`group flex w-full items-center gap-3 border-4 p-4 text-left ${
                  locked
                    ? "border-line opacity-40"
                    : cleared
                      ? "tile !border-good"
                      : "tile"
                }`}
              >
                <span
                  className="text-(--accent) transition-transform duration-200 group-hover:scale-125 group-hover:-rotate-6"
                  style={{ opacity: locked ? 0.5 : 1 }}
                >
                  <Icon name="swords" size={44} />
                </span>
                <div className="flex-1">
                  <div className="flex items-center gap-1.5 font-display text-lg">
                    {b.title} {cleared && <Icon name="check" size={16} className="text-good" />}
                  </div>
                  <div className="text-xs opacity-60">{b.setting}</div>
                  <div className="mt-1 text-[10px] uppercase tracking-widest text-(--accent)">
                    {b.level} · {b.boss?.hp} HP
                  </div>
                </div>
                <span className="flex items-center text-xs uppercase tracking-widest opacity-60">
                  {locked ? <Icon name="lock" size={14} /> : cleared ? "rematch" : "fight"}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function Fight({ boss, onExit }: { boss: Scenario; onExit: () => void }) {
  const state = useApp();
  const lang = boss.lang;
  const accent = lang === "ja" ? "lang-ja" : "lang-de";
  const maxHp = boss.boss!.hp;

  const [hp, setHp] = useState(maxHp);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [flash, setFlash] = useState<string | null>(null);
  const [won, setWon] = useState(false);
  const [recording, setRecording] = useState(false);
  const recognizer = useRef<Recognizer | null>(null);
  const scroller = useRef<HTMLDivElement>(null);

  useEffect(() => {
    tts(boss.opener, lang);
    return () => recognizer.current?.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: "smooth" });
  }, [turns, busy]);

  const send = async (text: string) => {
    const t = text.trim();
    if (!t || busy || won) return;

    if (!isTargetLang(t, lang)) {
      setFlash(`${lang === "ja" ? "日本語で！" : "Auf Deutsch!"} — the boss shrugs off your English.`);
      sfxWrong();
      setDraft("");
      setTimeout(() => setFlash(null), 1800);
      return;
    }

    // land a hit immediately (works even if the reply can't load)
    const nextHp = Math.max(0, hp - 1);
    setHp(nextHp);
    sfxCorrect(maxHp - nextHp);
    burst(innerWidth / 2, innerHeight * 0.3, undefined, 30);

    const next: Turn[] = [...turns, { role: "user", content: t }];
    setTurns(next);
    setDraft("");

    if (nextHp === 0) {
      win();
      return;
    }

    setBusy(true);
    try {
      const res = await fetch("/api/dojo", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ scenarioId: boss.id, messages: next }),
      });
      const json = await res.json();
      if (res.ok && json.reply) {
        setTurns([...next, { role: "assistant", content: json.reply }]);
        tts(json.reply, lang);
      } else {
        setFlash(json.error === "no_api_key" ? "(boss reels silently — add an API key for its voice)" : null);
        if (json.error === "no_api_key") setTimeout(() => setFlash(null), 1800);
      }
    } catch {
      /* offline: the hit still counted */
    } finally {
      setBusy(false);
    }
  };

  const win = () => {
    setWon(true);
    const firstClear = clearBoss(boss.id);
    if (firstClear) sfxBonus();
    else sfxCorrect(maxHp);
    burst(innerWidth / 2, innerHeight / 2, ["#ffd400", "#fff", "#ff3b1f"], 140);
  };

  const startRec = () => {
    if (recording || busy || won) return;
    const rec = startRecognition(
      lang,
      (i) => setDraft(i),
      (f) => {
        setRecording(false);
        setDraft(f);
        if (f.trim()) void send(f);
      },
      () => setRecording(false)
    );
    if (rec) {
      recognizer.current = rec;
      setRecording(true);
    }
  };

  const hpPct = (hp / maxHp) * 100;

  return (
    <div className={`${accent} flex h-dvh flex-col bg-bg`}>
      {/* boss header + health */}
      <div className="border-b-2 border-line p-3">
        <div className="flex items-center justify-between">
          <button className="hud-chip" onClick={onExit}>
            ← FLEE
          </button>
          <div className="font-display text-sm uppercase tracking-[0.2em] text-(--accent)">
            {boss.title}
          </div>
          <div className="hud-chip">
            {hp}/{maxHp} HP
          </div>
        </div>
        <div className="mt-2 flex items-center gap-3">
          <motion.span
            className="text-bad"
            animate={busy ? {} : { rotate: [0, -4, 4, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <Icon name="swords" size={36} />
          </motion.span>
          <div className="h-4 flex-1 border-2 border-line bg-black/40">
            <motion.div
              className="h-full bg-bad"
              animate={{ width: `${hpPct}%` }}
              transition={{ type: "spring", stiffness: 200, damping: 20 }}
            />
          </div>
        </div>
      </div>

      {/* chat */}
      <div ref={scroller} className="flex-1 space-y-3 overflow-y-auto p-4">
        <Bubble role="assistant" lang={lang} text={boss.opener} sub={boss.openerMeaning} />
        {turns.map((t, i) => (
          <Bubble key={i} role={t.role} lang={lang} text={t.content} />
        ))}
        {busy && <div className="animate-pulse pl-2 text-sm opacity-40">…</div>}
      </div>

      <AnimatePresence>
        {flash && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mx-4 mb-2 border-2 border-bad p-2 text-center text-sm text-bad"
          >
            {flash}
          </motion.div>
        )}
      </AnimatePresence>

      {/* input */}
      {!won ? (
        <div className="border-t-2 border-line p-3">
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
                className={`btn-primary px-4! py-3! select-none ${recording ? "animate-pulse" : ""}`}
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
              placeholder={recording ? "listening…" : "strike in the target language…"}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              disabled={busy}
            />
            <button className="btn-ghost px-4! py-3!" disabled={busy || !draft.trim()} aria-label="Strike">
              <Icon name="swords" size={18} />
            </button>
          </form>
        </div>
      ) : (
        <motion.div
          initial={{ y: 40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="border-t-4 border-(--accent) p-6 text-center"
        >
          <Icon name="swords" size={52} className="mx-auto text-(--accent)" />
          <div className="mt-2 font-display text-2xl text-(--accent)">BOSS DEFEATED</div>
          <div className="mt-1 text-sm opacity-70">
            +100 XP · card pack · streak freeze earned
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <button className="btn-ghost" onClick={onExit}>
              CHOOSE NEXT
            </button>
            <Link href="/reels" className="btn-primary text-center">
              BACK TO FEED
            </Link>
          </div>
        </motion.div>
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
