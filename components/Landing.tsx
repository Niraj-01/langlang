"use client";

// The front door. Arcade-brutalism marketing page for langlang —
// giant type, hard shadows, one electric accent that flips with the
// language toggle, and enough motion to prove the product's thesis:
// learning should feel like a game you can't put down.

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import jaSeed from "@/data/jlpt_n5.json";
import deSeed from "@/data/goethe_a1.json";
import type { Lang, VocabEntry } from "@/lib/types";
import { levelFromXp, useApp } from "@/lib/store";
import { useMounted } from "@/lib/useMounted";
import { burst } from "@/lib/confetti";
import { sfxAdd, sfxCorrect, sfxFlip } from "@/lib/audio";
import { DeNoun, JaWord } from "@/components/Lex";
import { Icon } from "@/components/Icon";
import { AuthButton } from "@/components/AuthButton";

const JA = jaSeed as VocabEntry[];
const DE = deSeed as VocabEntry[];
const SEED_COUNT = JA.length + DE.length;

// Ambient hero glyphs — fixed positions so SSR and hydration agree.
const GLYPHS: Record<Lang, string[]> = {
  ja: ["水", "火", "猫", "夢", "空", "食", "山", "語"],
  de: ["ß", "Ü", "Ö", "Ä", "W", "Z", "K", "G"],
};
const GLYPH_SPOTS = [
  { top: 8, left: 6, size: 5.5, depth: 22, dur: 6.5 },
  { top: 16, left: 82, size: 8, depth: 34, dur: 8 },
  { top: 58, left: 8, size: 7, depth: 30, dur: 7.2 },
  { top: 70, left: 86, size: 5, depth: 18, dur: 6 },
  { top: 34, left: 68, size: 4, depth: 40, dur: 9 },
  { top: 78, left: 38, size: 4.5, depth: 26, dur: 7.8 },
];

const COPY = {
  ja: {
    track: "JLPT N5 → N1",
    verb: "日本語",
    marqueeA: JA.slice(0, 14),
    marqueeB: JA.slice(14, 28),
  },
  de: {
    track: "Goethe A1 → C1",
    verb: "Deutsch",
    marqueeA: DE.slice(0, 14),
    marqueeB: DE.slice(14, 28),
  },
} as const;

// ---- scroll reveal -------------------------------------------------------

function useReveal(rootRef: React.RefObject<HTMLElement | null>) {
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            e.target.classList.add("in");
            io.unobserve(e.target);
          }
        }
      },
      { threshold: 0.15 },
    );
    root.querySelectorAll(".rv").forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [rootRef]);
}

// ---- count-up stat -------------------------------------------------------

function Stat({
  value,
  suffix = "",
  label,
  delay = 0,
}: {
  value: number;
  suffix?: string;
  label: string;
  delay?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [n, setN] = useState(0);
  const started = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (!e.isIntersecting || started.current) return;
        started.current = true;
        const t0 = performance.now();
        const dur = 900;
        const tick = (t: number) => {
          const p = Math.min(1, (t - t0) / dur);
          setN(Math.round(value * (1 - Math.pow(1 - p, 3))));
          if (p < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
        io.disconnect();
      },
      { threshold: 0.5 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [value]);

  return (
    <div ref={ref} className="rv text-center" style={{ "--rv-delay": `${delay}s` } as React.CSSProperties}>
      <div className="font-display text-5xl text-(--accent) sm:text-6xl">
        {n}
        {suffix}
      </div>
      <div className="mt-2 text-[11px] font-bold uppercase tracking-[0.3em] opacity-60">
        {label}
      </div>
    </div>
  );
}

// ---- hero glyph (click to pop) -------------------------------------------

function HeroGlyph({
  spot,
  char,
  onPop,
}: {
  spot: (typeof GLYPH_SPOTS)[number];
  char: string;
  onPop: () => void;
}) {
  const [popping, setPopping] = useState(false);

  return (
    <button
      type="button"
      aria-hidden
      tabIndex={-1}
      onClick={(e) => {
        if (popping) return;
        setPopping(true);
        sfxAdd();
        burst(e.clientX, e.clientY, undefined, 30);
        setTimeout(() => {
          setPopping(false);
          onPop();
        }, 480);
      }}
      className="pointer-events-auto absolute cursor-crosshair select-none"
      style={{
        top: `${spot.top}%`,
        left: `${spot.left}%`,
        fontSize: `${spot.size}rem`,
        transform: `translate(calc(var(--mx, 0) * ${spot.depth}px), calc(var(--my, 0) * ${spot.depth}px))`,
        transition: "transform 0.25s ease-out",
      }}
    >
      <span
        className={`glyph-float font-jp block font-bold text-(--accent) opacity-[0.13] hover:opacity-40 ${
          popping ? "glyph-pop" : ""
        }`}
        style={{ "--gf-t": `${spot.dur}s`, transition: "opacity 0.2s" } as React.CSSProperties}
      >
        {char}
      </span>
    </button>
  );
}

// ---- try-one-rep demo card -----------------------------------------------

function DemoCard({ lang }: { lang: Lang }) {
  const pool = lang === "ja" ? JA : DE;
  const [i, setI] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [reps, setReps] = useState(0);
  const entry = pool[(i * 7 + 3) % pool.length];

  // new language, new card
  useEffect(() => {
    setFlipped(false);
  }, [lang]);

  const next = useCallback(() => {
    setFlipped(false);
    setTimeout(() => setI((v) => v + 1), 280);
  }, []);

  return (
    <div className="mx-auto w-full max-w-sm">
      <div className="flip-scene h-72">
        <div className={`flip-inner relative h-full w-full ${flipped ? "flipped" : ""}`}>
          {/* front */}
          <button
            type="button"
            onClick={() => {
              sfxFlip();
              setFlipped(true);
            }}
            className={`flip-face absolute inset-0 flex flex-col items-center justify-center gap-4 border-4 border-line bg-panel p-6 ${
              flipped ? "pointer-events-none" : ""
            }`}
            style={{ boxShadow: "8px 8px 0 rgba(0,0,0,.6)" }}
          >
            <span className="tag">{lang === "ja" ? "字 word" : "wort"}</span>
            {lang === "ja" ? (
              <JaWord word={entry.word} reading={entry.reading} furigana className="text-6xl" />
            ) : (
              <DeNoun entry={entry} className="text-5xl font-bold" />
            )}
            <span className="text-xs font-bold uppercase tracking-[0.3em] opacity-40">
              tap to flip
            </span>
          </button>

          {/* back */}
          <div
            aria-hidden={!flipped}
            className={`flip-face flip-back absolute inset-0 flex flex-col items-center justify-center gap-4 border-4 border-(--accent) bg-panel p-6 ${
              flipped ? "" : "pointer-events-none"
            }`}
            style={{ boxShadow: "8px 8px 0 rgba(0,0,0,.6)" }}
          >
            <span className="tag">meaning</span>
            <div className="text-center text-3xl font-bold">{entry.meaning}</div>
            {entry.example && (
              <div className={`text-center text-base opacity-60 ${lang === "ja" ? "font-jp" : ""}`}>
                {entry.example}
              </div>
            )}
            <div className="mt-2 grid w-full grid-cols-2 gap-3">
              <button
                type="button"
                onClick={next}
                className="btn-ghost !py-3 !text-xs"
              >
                Again
              </button>
              <button
                type="button"
                onClick={(e) => {
                  sfxCorrect(reps);
                  burst(e.clientX, e.clientY);
                  setReps((r) => r + 1);
                  next();
                }}
                className="btn-primary !py-3 !text-sm"
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      </div>
      <div className="mt-6 text-center text-xs font-bold uppercase tracking-[0.3em] opacity-50">
        {reps === 0 ? (
          <>this is the whole loop<span className="blink">_</span></>
        ) : (
          <span className="text-(--accent)">
            ×{reps} combo — imagine 200 of these on a streak
          </span>
        )}
      </div>
    </div>
  );
}

// ---- features -------------------------------------------------------------

const FEATURES = [
  {
    href: "/reels",
    icon: "play" as const,
    title: "The Doomscroll",
    body: "Reviews, new words, quizzes, memes — one infinite snap feed scheduled by FSRS. No study menu. Just scroll.",
  },
  {
    href: "/path",
    icon: "map" as const,
    title: "The Path",
    body: "A winding unit roadmap with boss checkpoints, stars, and your streak — always in sync with the feed.",
  },
  {
    href: "/dojo",
    icon: "torii" as const,
    title: "Conversation Dojo",
    body: "Roleplay ordering ramen or renting a flat with an AI — every mistake gets filed straight back into your deck.",
  },
  {
    href: "/profile",
    icon: "layers" as const,
    title: "Quests, Packs & Pet",
    body: "Clear daily quests, rip open card packs with golden pulls, and keep a pet that judges your streak.",
  },
  {
    href: "/boss",
    icon: "swords" as const,
    title: "Boss Battles",
    body: "Timed gauntlets over everything you've learned. Beat the boss, take the loot.",
  },
  {
    href: "/learn",
    icon: "book" as const,
    title: "Learn Zone",
    body: "Calm reference wing: kana charts, 101 kanji with animated stroke order, phrasebook, drawing board.",
  },
  {
    href: "/progress",
    icon: "chart" as const,
    title: "Progress & Wrapped",
    body: "Streak calendar, exam countdown forecasts, and a Weekly Wrapped of your grind.",
  },
];

// ---- page -----------------------------------------------------------------

export function Landing() {
  const [lang, setLang] = useState<Lang>("ja");
  const [glyphGen, setGlyphGen] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const heroRef = useRef<HTMLDivElement>(null);
  const mounted = useMounted();
  const app = useApp();

  useReveal(rootRef);

  const onHeroMove = useCallback((e: ReactPointerEvent<HTMLDivElement>) => {
    const el = heroRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    el.style.setProperty("--mx", String(((e.clientX - r.left) / r.width - 0.5) * 2));
    el.style.setProperty("--my", String(((e.clientY - r.top) / r.height - 0.5) * 2));
  }, []);

  const c = COPY[lang];
  const glyphs = GLYPHS[lang];
  const returning = mounted && app.xp > 0;
  const level = levelFromXp(app.xp).level;
  // brand-new visitors go through onboarding; everyone else straight to the feed
  const startHref = !mounted || app.onboarding.done || app.xp > 0 ? "/reels" : "/onboarding";

  return (
    <div
      ref={rootRef}
      className={`landing min-h-dvh overflow-x-clip text-ink ${lang === "ja" ? "lang-ja" : "lang-de"}`}
    >
      {/* ---- top bar ---- */}
      <header className="fixed inset-x-0 top-0 z-40 border-b-4 border-line bg-bg/85 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3">
          <Link href="/" className="font-display text-lg tracking-tight">
            LANG<span className="text-(--accent)">LANG</span>
          </Link>

          {/* language toggle — flips the accent across the whole page */}
          <div className="flex border-2 border-line" role="group" aria-label="Language track">
            {(["ja", "de"] as const).map((l) => (
              <button
                key={l}
                type="button"
                onClick={() => setLang(l)}
                className={`px-3 py-1.5 font-display text-xs uppercase transition-colors ${
                  lang === l ? "bg-(--accent) text-black" : "opacity-60 hover:opacity-100"
                }`}
              >
                {l === "ja" ? "JA" : "DE"}
              </button>
            ))}
          </div>

          <AuthButton variant="chip" />
        </div>
      </header>

      {/* ---- hero ---- */}
      <section
        ref={heroRef}
        onPointerMove={onHeroMove}
        className="relative flex min-h-dvh flex-col items-center justify-center px-4 pt-20 pb-16"
      >
        {/* clickable ambient glyphs */}
        <div className="pointer-events-none absolute inset-0" aria-hidden>
          {GLYPH_SPOTS.map((spot, i) => (
            <HeroGlyph
              key={`${lang}-${i}-${glyphGen}`}
              spot={spot}
              char={glyphs[(i + glyphGen) % glyphs.length]}
              onPop={() => setGlyphGen((g) => g + 1)}
            />
          ))}
        </div>

        <div className="relative z-10 flex max-w-4xl flex-col items-center text-center">
          <div className="tag mb-6 border-2 border-line px-3 py-1.5">
            {c.track} · free · local-first
          </div>

          <h1 className="font-display text-[16vw] leading-[0.9] sm:text-8xl md:text-9xl">
            <span className="slam block" style={{ animationDelay: "0.05s" }}>
              SCROLL.
            </span>
            <span className="slam block text-(--accent)" style={{ animationDelay: "0.22s" }}>
              COMBO.
            </span>
            <span
              className="slam block text-transparent"
              style={{ animationDelay: "0.4s", WebkitTextStroke: "2px var(--color-ink)" }}
            >
              FLUENT.
            </span>
          </h1>

          <p className="mt-8 max-w-md text-lg opacity-75">
            The doomscroll that makes you fluent in{" "}
            <span className="font-jp font-bold text-(--accent)">{c.verb}</span>. Spaced
            repetition disguised as the feed you were going to open anyway.
          </p>

          <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row">
            <Link href={startHref} className="btn-primary inline-flex items-center gap-2 px-8">
              <Icon name="play" size={16} /> Start scrolling
            </Link>
            <Link href="/learn" className="btn-ghost px-8">
              Open dashboard
            </Link>
          </div>

          {returning && (
            <Link
              href="/reels"
              className="hud-chip mt-8 gap-3 !px-4 !py-2 text-sm"
            >
              <Icon name="flame" size={16} className="animate-flame text-(--accent)" />
              <span className="font-display">{app.streak.current}-day streak</span>
              <span className="opacity-50">·</span>
              <span className="font-display">LV {level}</span>
              <span className="text-(--accent)">continue →</span>
            </Link>
          )}
        </div>

        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 animate-bounce text-2xl opacity-40" aria-hidden>
          ↓
        </div>
      </section>

      {/* ---- word ticker ---- */}
      <section className="border-y-4 border-line bg-panel py-4" aria-hidden>
        {[c.marqueeA, c.marqueeB].map((words, row) => (
          <div key={row} className="overflow-hidden py-2">
            <div
              className={`marquee font-display text-2xl ${row === 1 ? "rev opacity-40" : ""}`}
              style={{ "--marquee-t": row === 1 ? "38s" : "26s" } as React.CSSProperties}
            >
              {[...words, ...words].map((w, i) => (
                <span key={i} className="flex items-baseline gap-2 whitespace-nowrap">
                  {lang === "ja" ? (
                    <span className="font-jp">{w.word}</span>
                  ) : (
                    <DeNoun entry={w} />
                  )}
                  <span className="text-xs font-body font-normal lowercase opacity-40">
                    {w.meaning}
                  </span>
                  <span className="text-(--accent)">✦</span>
                </span>
              ))}
            </div>
          </div>
        ))}
      </section>

      {/* ---- stats ---- */}
      <section className="mx-auto grid max-w-4xl grid-cols-2 gap-10 px-4 py-24 sm:grid-cols-4">
        <Stat value={SEED_COUNT} label="words seeded" />
        <Stat value={90} suffix="%" label="target retention" delay={0.1} />
        <Stat value={19} label="FSRS weights" delay={0.2} />
        <Stat value={100} suffix="ms" label="to dopamine" delay={0.3} />
      </section>

      {/* ---- try one rep ---- */}
      <section className="border-y-4 border-line bg-black/25 px-4 py-24">
        <div className="mx-auto max-w-4xl">
          <h2 className="rv font-display text-center text-4xl sm:text-5xl">
            TRY ONE <span className="text-(--accent)">REP</span>
          </h2>
          <p className="rv mx-auto mt-4 max-w-sm text-center opacity-60" style={{ "--rv-delay": "0.1s" } as React.CSSProperties}>
            No signup. No tutorial. The card below is the entire app — flip it.
          </p>
          <div className="rv mt-12" style={{ "--rv-delay": "0.2s" } as React.CSSProperties}>
            <DemoCard lang={lang} />
          </div>
        </div>
      </section>

      {/* ---- features ---- */}
      <section className="mx-auto max-w-5xl px-4 py-24">
        <h2 className="rv font-display text-4xl sm:text-5xl">
          EVERYTHING IS <span className="text-(--accent)">A CARD</span>
        </h2>
        <p className="rv mt-4 max-w-lg opacity-60" style={{ "--rv-delay": "0.1s" } as React.CSSProperties}>
          No study-mode menu. Every mechanic feeds the same deck, and the deck feeds the scroll.
        </p>

        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f, i) => (
            <Link
              key={f.href}
              href={f.href}
              className="tile rv flex flex-col gap-3 p-6"
              style={{ "--rv-delay": `${(i % 3) * 0.1}s` } as React.CSSProperties}
            >
              <Icon name={f.icon} size={30} className="text-(--accent)" />
              <span className="font-display text-lg uppercase">{f.title}</span>
              <span className="text-sm leading-relaxed opacity-60">{f.body}</span>
              <span className="mt-auto pt-2 font-display text-xs uppercase tracking-widest text-(--accent)">
                open →
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* ---- final CTA ---- */}
      <section className="border-t-4 border-line px-4 py-24 text-center">
        <h2 className="rv font-display text-5xl leading-[0.95] sm:text-7xl">
          YOUR STREAK
          <br />
          <span className="text-(--accent)">STARTS NOW</span>
        </h2>
        <div className="rv mt-10" style={{ "--rv-delay": "0.15s" } as React.CSSProperties}>
          <Link href={startHref} className="btn-primary inline-block px-10 text-xl">
            ▶ Open the feed
          </Link>
        </div>
        <p className="rv mt-6 text-xs uppercase tracking-[0.3em] opacity-40" style={{ "--rv-delay": "0.25s" } as React.CSSProperties}>
          works offline · local-first · sign in with Google to sync across devices
        </p>
      </section>

      <footer className="border-t-4 border-line px-4 py-8">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-4 text-xs opacity-50">
          <span className="font-display">
            LANG<span className="text-(--accent)">LANG</span>
          </span>
          <span>
            der=<span className="text-der">blue</span> · die=
            <span className="text-die">red</span> · das=<span className="text-das">green</span>. always.
          </span>
        </div>
      </footer>
    </div>
  );
}
