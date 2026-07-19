"use client";

// Profile: the pet's home. Evolution, cosmetics closet, daily quests,
// card packs, and the menace-mode toggle all live here.

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  useApp,
  petMood,
  levelFromXp,
  toggleCosmetic,
  renamePet,
  setMenace,
  setDailyGoal,
  dueCards,
} from "@/lib/store";
import { BADGES, DAILY_GOALS } from "@/lib/achievements";
import { COSMETICS, petStageName, nextStageXp, petStage, PET_STAGES } from "@/lib/quests";
import { Icon, type IconName } from "./Icon";
import { CosmeticGlyph } from "./CosmeticGlyph";
import { VoicePicker } from "./VoicePicker";
import { fireRoast, notifyPermission, requestNotify } from "@/lib/notify";
import { imageCount } from "@/lib/wordImage";
import { Pet } from "./Pet";
import { PackOpen } from "./PackOpen";
import { StreakPanel } from "./StreakPanel";
import { AuthButton } from "./AuthButton";

export function Profile() {
  const state = useApp();
  const [opening, setOpening] = useState(false);
  const [roast, setRoast] = useState<string | null>(null);
  const [roasting, setRoasting] = useState(false);
  const [editing, setEditing] = useState(false);
  const [nameDraft, setNameDraft] = useState("");

  const accent = state.lang === "ja" ? "lang-ja" : "lang-de";
  const mood = petMood(state);
  const { level, into, span } = levelFromXp(state.xp);
  const stage = petStage(state.xp);
  const next = nextStageXp(state.xp);
  const due = dueCards(state, state.lang).length;

  const roastMe = async () => {
    setRoasting(true);
    const { text } = await fireRoast(state, roast ?? undefined);
    setRoast(text);
    setRoasting(false);
  };

  const enableMenace = async () => {
    if (!state.menace) {
      const perm = notifyPermission();
      if (perm === "default") await requestNotify();
    }
    setMenace(!state.menace);
  };

  return (
    <div className={`${accent} min-h-dvh bg-bg pb-10`}>
      <div className="flex items-center justify-between border-b-2 border-line p-3">
        <Link href="/reels" className="hud-chip gap-1">
          <Icon name="arrowLeft" size={14} /> FEED
        </Link>
        <div className="font-display text-sm uppercase tracking-[0.3em] text-(--accent)">
          Profile
        </div>
        <Link href="/dojo" className="hud-chip gap-1">
          <Icon name="torii" size={14} /> DOJO
        </Link>
      </div>

      {/* pet */}
      <div className="rise flex flex-col items-center gap-3 p-6">
        <Pet xp={state.xp} mood={mood} equipped={state.pet.equipped} size={180} />
        {editing ? (
          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              renamePet(nameDraft);
              setEditing(false);
            }}
          >
            <input
              autoFocus
              className="border-2 border-line bg-black/30 px-2 py-1 text-center outline-none focus:border-(--accent)"
              value={nameDraft}
              onChange={(e) => setNameDraft(e.target.value)}
              placeholder={state.pet.name}
            />
            <button className="hud-chip" aria-label="Save name"><Icon name="check" size={14} /></button>
          </form>
        ) : (
          <button
            className="font-display text-2xl"
            onClick={() => {
              setNameDraft(state.pet.name);
              setEditing(true);
            }}
          >
            {state.pet.name} <Icon name="pencil" size={13} className="inline opacity-40" />
          </button>
        )}
        <div className="text-xs uppercase tracking-[0.3em] text-(--accent)">
          {petStageName(state.xp)} · stage {stage + 1}/5 ·{" "}
          {mood === "happy" ? "thriving" : mood === "neutral" ? "content" : "misses you"}
        </div>
        {next !== null && (
          <div className="w-full max-w-xs">
            <div className="mb-1 flex justify-between text-[10px] uppercase tracking-widest opacity-50">
              <span>evolves at {next} XP</span>
              <span>{state.xp} XP</span>
            </div>
            <div className="h-2 w-full border-2 border-line bg-black/40">
              <div
                className="bar-anim h-full bg-(--accent)"
                style={{
                  width: `${Math.min(100, ((state.xp - PET_STAGES[stage].min) / (next - PET_STAGES[stage].min)) * 100)}%`,
                }}
              />
            </div>
          </div>
        )}
      </div>

      {/* stat row */}
      <div className="stagger grid grid-cols-4 gap-2 px-4">
        <Stat label="level" value={level} />
        <Stat
          label="streak"
          value={
            <span className="inline-flex items-center gap-1">
              {state.streak.current}
              <Icon name="flame" size={16} className="text-(--accent)" />
            </span>
          }
        />
        <Stat label="due" value={due} />
        <Stat label="best combo" value={state.bestCombo} />
      </div>
      <div className="px-4 pt-2">
        <div className="mb-1 flex justify-between text-[10px] uppercase tracking-widest opacity-50">
          <span>LV {level}</span>
          <span>{into}/{span} XP</span>
        </div>
        <div className="h-2 w-full border-2 border-line bg-black/40">
          <div className="bar-anim h-full bg-(--accent)" style={{ width: `${(into / span) * 100}%` }} />
        </div>
      </div>

      {/* account & sync */}
      <Section title="Account">
        <AuthButton variant="panel" />
      </Section>

      {/* voice */}
      <Section title="Voice">
        <VoicePicker lang={state.lang} />
      </Section>

      {/* streak */}
      <Section title="Streak">
        <StreakPanel state={state} />
      </Section>

      {/* daily goal */}
      <Section title="Daily Goal">
        <div className="border-2 border-line bg-panel p-4">
          <div className="flex items-center justify-between">
            <div className="text-sm opacity-70">
              {state.today.xp >= state.dailyGoal ? (
                <span className="inline-flex items-center gap-1 text-good">
                  <Icon name="check" size={14} /> goal smashed today
                </span>
              ) : (
                `${state.dailyGoal - state.today.xp} XP to go today`
              )}
            </div>
            <div className="flex border-2 border-line">
              {DAILY_GOALS.map((g) => (
                <button
                  key={g}
                  onClick={() => setDailyGoal(g)}
                  className={`px-3 py-1 font-display text-xs ${
                    state.dailyGoal === g ? "bg-(--accent) text-black" : "opacity-60"
                  }`}
                >
                  {g}
                </button>
              ))}
            </div>
          </div>
          <div className="mt-3 h-2 w-full border-2 border-line bg-black/40">
            <div
              className={`bar-anim h-full ${state.today.xp >= state.dailyGoal ? "bg-good" : "bg-(--accent)"}`}
              style={{ width: `${Math.min(100, (state.today.xp / state.dailyGoal) * 100)}%` }}
            />
          </div>
          <div className="mt-1 flex justify-between text-[10px] uppercase tracking-widest opacity-50">
            <span>{state.today.xp} XP today</span>
            <span>goal {state.dailyGoal}</span>
          </div>
        </div>
      </Section>

      {/* modes hub */}
      <Section title="Modes">
        <div className="stagger grid grid-cols-3 gap-2">
          {([
            { href: "/path", icon: "map", label: "Path" },
            { href: "/lesson?mode=review", icon: "repeat", label: "Practice" },
            { href: "/mistakes", icon: "bookAlert", label: "Mistakes" },
            { href: "/saved", icon: "heart", label: "Saved" },
            { href: "/dojo", icon: "torii", label: "Dojo" },
            { href: "/boss", icon: "swords", label: "Bosses" },
            { href: "/mine", icon: "pickaxe", label: "Mine" },
            { href: "/focus", icon: "focus", label: "Focus" },
            { href: "/progress", icon: "chart", label: "Progress" },
            { href: "/league", icon: "trophy", label: "League" },
            { href: "/wrapped", icon: "gift", label: "Wrapped" },
            { href: "/learn", icon: "book", label: "Learn JP" },
            { href: "/learn-de", icon: "book", label: "Learn DE" },
          ] as { href: string; icon: IconName; label: string }[]).map((m) => (
            <Link
              key={m.href}
              href={m.href}
              className="tile group flex flex-col items-center gap-1.5 !border-2 p-3"
            >
              <Icon name={m.icon} size={22} className="text-(--accent) transition-transform group-hover:scale-125" />
              <span className="text-[10px] uppercase tracking-widest opacity-60">
                {m.label}
              </span>
            </Link>
          ))}
        </div>
      </Section>

      {/* packs */}
      <Section title="Card Packs">
        <div className="flex items-center justify-between border-2 border-line bg-panel p-4">
          <div>
            <div className="flex items-center gap-2 font-display text-3xl">
              {state.packs} <Icon name="layers" size={26} className="text-yellow-300" />
            </div>
            <div className="text-xs uppercase tracking-widest opacity-50">
              earn packs by clearing quests
            </div>
          </div>
          <motion.button
            whileTap={{ scale: 0.94 }}
            disabled={state.packs <= 0}
            className={`btn-primary ${state.packs <= 0 ? "opacity-40" : ""}`}
            onClick={() => state.packs > 0 && setOpening(true)}
          >
            OPEN
          </motion.button>
        </div>
      </Section>

      {/* quests */}
      <Section title="Daily Quests">
        <div className="space-y-2">
          {state.quests.map((q) => (
            <div
              key={q.key}
              className={`border-2 p-3 ${q.done ? "border-good bg-good/10" : "border-line bg-panel"}`}
            >
              <div className="flex justify-between text-sm">
                <span className={`inline-flex items-center gap-1 ${q.done ? "text-good" : ""}`}>
                  {q.done && <Icon name="check" size={13} />}
                  {q.label}
                </span>
                <span className="opacity-60">
                  {q.progress}/{q.target}
                </span>
              </div>
              <div className="mt-2 h-2 w-full border-2 border-line bg-black/40">
                <div
                  className={`bar-anim h-full ${q.done ? "bg-good" : "bg-(--accent)"}`}
                  style={{ width: `${(q.progress / q.target) * 100}%` }}
                />
              </div>
            </div>
          ))}
          <div className="text-center text-[10px] uppercase tracking-widest opacity-40">
            each cleared quest = 1 card pack
          </div>
        </div>
      </Section>

      {/* badges */}
      <Section title="Badges">
        <div className="stagger grid grid-cols-4 gap-2">
          {BADGES.map((b) => {
            const got = b.earned(state);
            return (
              <div
                key={b.id}
                title={b.hint}
                className={`flex flex-col items-center gap-1 border-2 p-2 text-center ${
                  got ? "border-(--accent) bg-panel" : "border-line bg-black/20 opacity-35 grayscale"
                }`}
              >
                <Icon name={b.icon} size={22} className={got ? "text-(--accent)" : ""} />
                <span className="text-[8px] uppercase leading-tight tracking-wide opacity-70">
                  {b.label}
                </span>
              </div>
            );
          })}
        </div>
        <div className="mt-2 text-center text-[10px] uppercase tracking-widest opacity-40">
          {BADGES.filter((b) => b.earned(state)).length}/{BADGES.length} earned
        </div>
      </Section>

      {/* cosmetics */}
      <Section title="Closet">
        {state.pet.cosmetics.length === 0 ? (
          <div className="border-2 border-line bg-panel p-4 text-sm opacity-50">
            No cosmetics yet — open card packs to dress up {state.pet.name}.
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-2">
            {COSMETICS.filter((c) => state.pet.cosmetics.includes(c.id)).map((c) => {
              const on = state.pet.equipped.includes(c.id);
              return (
                <button
                  key={c.id}
                  onClick={() => toggleCosmetic(c.id)}
                  className={`flex flex-col items-center gap-1 border-4 p-3 ${on ? "border-(--accent)" : "border-line bg-panel"}`}
                >
                  <CosmeticGlyph id={c.id} size={40} />
                  <span className="text-[10px] uppercase tracking-widest opacity-60">
                    {on ? "worn" : c.label}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </Section>

      {/* menace mode */}
      <Section title="Menace Mode">
        <div className="border-2 border-line bg-panel p-4">
          <div className="flex items-center justify-between">
            <div className="pr-3 text-sm opacity-70">
              Let the app roast you into studying. Gen-Z tone, opt-in, deletable.
            </div>
            <button
              onClick={enableMenace}
              className={`h-8 w-14 shrink-0 border-2 border-line ${state.menace ? "bg-(--accent)" : "bg-black/40"} relative`}
            >
              <span
                className={`absolute top-0.5 h-6 w-6 bg-black transition-all ${state.menace ? "left-7" : "left-0.5"}`}
              />
            </button>
          </div>
          <button
            className="btn-ghost mt-3 w-full"
            onClick={roastMe}
            disabled={roasting}
          >
            {roasting ? "cooking…" : "ROAST ME NOW"}
          </button>
          {roast && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-3 border-l-4 border-(--accent) pl-3 text-sm italic"
            >
              “{roast}”
            </motion.div>
          )}
        </div>
      </Section>

      {/* open-data credits (license attribution) */}
      <Section title="Credits">
        <div className="space-y-1 border-2 border-line bg-panel p-4 text-xs opacity-60">
          <div>
            Sentences:{" "}
            <a href="https://tatoeba.org" target="_blank" rel="noreferrer" className="underline hover:text-(--accent)">
              Tatoeba
            </a>{" "}
            — CC BY 2.0 FR
          </div>
          <div>
            Kanji stroke data:{" "}
            <a href="https://kanjivg.tagaini.net" target="_blank" rel="noreferrer" className="underline hover:text-(--accent)">
              KanjiVG
            </a>{" "}
            — CC BY-SA 3.0
          </div>
          <div>
            Japanese word audio:{" "}
            <a href="https://kanjialive.com" target="_blank" rel="noreferrer" className="underline hover:text-(--accent)">
              Kanji alive
            </a>{" "}
            — CC BY 4.0
          </div>
          <div>
            Voice recordings:{" "}
            <a href="https://commonvoice.mozilla.org" target="_blank" rel="noreferrer" className="underline hover:text-(--accent)">
              Mozilla Common Voice
            </a>{" "}
            — CC0
          </div>
          {imageCount("ja") + imageCount("de") > 0 && (
            <div>
              Word icons:{" "}
              <a href="https://tabler.io/icons" target="_blank" rel="noreferrer" className="underline hover:text-(--accent)">
                Tabler Icons
              </a>{" "}
              — MIT
            </div>
          )}
          <div>
            Frequency data:{" "}
            <a href="https://wortschatz.uni-leipzig.de" target="_blank" rel="noreferrer" className="underline hover:text-(--accent)">
              Leipzig Corpora Collection
            </a>{" "}
            — CC BY 4.0 ·{" "}
            <a href="https://github.com/hermitdave/FrequencyWords" target="_blank" rel="noreferrer" className="underline hover:text-(--accent)">
              FrequencyWords
            </a>{" "}
            — CC BY-SA 4.0
          </div>
        </div>
      </Section>

      {opening && <PackOpen lang={state.lang} onClose={() => setOpening(false)} />}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rise px-4 pt-6" style={{ "--rise-delay": "0.15s" } as React.CSSProperties}>
      <div className="mb-2 font-display text-xs uppercase tracking-[0.3em] opacity-60">
        {title}
      </div>
      {children}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="border-2 border-line bg-black/30 p-2 text-center transition-colors hover:border-(--accent)">
      <div className="font-display text-2xl">{value}</div>
      <div className="text-[9px] uppercase tracking-widest opacity-50">{label}</div>
    </div>
  );
}
