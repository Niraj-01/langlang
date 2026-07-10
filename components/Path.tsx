"use client";

// The Path — Duolingo-style roadmap. Units weave down the screen around a
// dashed spine; tap a node for a bottom sheet with its words and a CTA into
// the feed (units) or the boss fight. The frontier comes straight from the
// store's newIndex, so progress here always matches the Doomscroll.

import { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useApp } from "@/lib/store";
import { useMounted } from "@/lib/useMounted";
import { buildPath, UNIT_SIZE, type PathNode } from "@/lib/path";
import { StreakPanel } from "./StreakPanel";

export function Path() {
  const state = useApp();
  const mounted = useMounted();
  const [sel, setSel] = useState<PathNode | null>(null);
  // streak week + frontier are date/localStorage-dependent — client-only
  if (!mounted) return <div className="lang-ja min-h-dvh bg-bg" />;

  const lang = state.lang;
  const accent = lang === "ja" ? "lang-ja" : "lang-de";
  const nodes = buildPath(state, lang);

  const learned = state.newIndex[lang];
  const doneUnits = nodes.filter((n) => n.kind === "unit" && n.state === "done").length;

  return (
    <div className={`${accent} min-h-dvh bg-bg pb-24`}>
      <div className="flex items-center justify-between border-b-2 border-line p-3">
        <Link href="/reels" className="hud-chip">
          ← FEED
        </Link>
        <div className="font-display text-sm uppercase tracking-[0.3em] text-(--accent)">
          The Path
        </div>
        <div className="hud-chip">
          <span className="animate-flame inline-block">🔥</span>
          <span className="font-display">{state.streak.current}</span>
        </div>
      </div>

      <div className="mx-auto max-w-md px-4">
        <div className="rise pt-4">
          <StreakPanel state={state} />
        </div>

        <div
          className="rise mt-4 text-center text-[10px] uppercase tracking-[0.3em] opacity-50"
          style={{ "--rise-delay": "0.1s" } as React.CSSProperties}
        >
          {doneUnits} unit{doneUnits === 1 ? "" : "s"} cleared · {learned} words dealt ·{" "}
          {lang === "ja" ? "JLPT N5" : "Goethe A1"}
        </div>

        {/* the trail */}
        <div className="relative mt-6">
          {/* dashed spine */}
          <div
            className="absolute inset-y-0 left-1/2 w-0 -translate-x-1/2 border-l-4 border-dashed border-line"
            aria-hidden
          />
          <div className="relative flex flex-col items-center gap-7">
            {nodes.map((n, i) => (
              <PathNodeButton
                key={n.key}
                node={n}
                offset={Math.round(Math.sin(i * 0.9) * 84)}
                delay={Math.min(i, 10) * 0.05}
                onSelect={() => n.state !== "locked" && setSel(n)}
              />
            ))}
            <div className="pt-2 text-2xl opacity-30" aria-hidden>
              🏁
            </div>
          </div>
        </div>
      </div>

      {/* node bottom sheet */}
      <AnimatePresence>
        {sel && (
          <motion.div
            className="fixed inset-0 z-40 flex items-end justify-center bg-black/60"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSel(null)}
          >
            <motion.div
              className="w-full max-w-md border-4 border-(--accent) bg-panel p-5"
              style={{ boxShadow: "0 -8px 0 rgba(0,0,0,.4)" }}
              initial={{ y: 80 }}
              animate={{ y: 0 }}
              exit={{ y: 120 }}
              transition={{ type: "spring", stiffness: 360, damping: 32 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-3">
                <span className="text-4xl">{sel.emoji}</span>
                <div className="flex-1">
                  <div className="font-display text-xl uppercase">{sel.title}</div>
                  <div className="text-[10px] uppercase tracking-widest opacity-50">
                    {sel.kind === "boss"
                      ? (sel.setting ?? "boss checkpoint")
                      : sel.state === "done"
                        ? `cleared ${"★".repeat(sel.stars ?? 0)}${"☆".repeat(3 - (sel.stars ?? 0))}`
                        : `${sel.words?.length ?? UNIT_SIZE} new words ahead`}
                  </div>
                </div>
                <button className="hud-chip" onClick={() => setSel(null)}>
                  ✕
                </button>
              </div>

              {sel.kind === "unit" && sel.words && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {sel.words.map((w) => (
                    <span
                      key={w.word}
                      className={`border-2 border-line bg-black/30 px-2 py-1 text-sm ${
                        lang === "ja" ? "font-jp" : ""
                      } ${sel.state === "current" ? "opacity-60" : ""}`}
                      title={w.meaning}
                    >
                      {w.word}
                      <span className="ml-1.5 text-[10px] font-sans opacity-50">{w.meaning}</span>
                    </span>
                  ))}
                </div>
              )}

              {sel.kind === "boss" ? (
                <Link href="/boss" className="btn-primary mt-4 block w-full text-center">
                  {sel.state === "done" ? "⚔ REMATCH" : "⚔ FIGHT THE BOSS"}
                </Link>
              ) : (
                <Link href="/reels" className="btn-primary mt-4 block w-full text-center">
                  {sel.state === "done" ? "▶ REVIEW IN THE FEED" : "▶ LEARN IN THE FEED"}
                </Link>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function PathNodeButton({
  node,
  offset,
  delay,
  onSelect,
}: {
  node: PathNode;
  offset: number;
  delay: number;
  onSelect: () => void;
}) {
  const locked = node.state === "locked";
  const current = node.state === "current";
  const done = node.state === "done";
  const boss = node.kind === "boss";

  return (
    // offset lives on the wrapper — .rise animates transform and would clobber it
    <div style={{ transform: `translateX(${offset}px)` }}>
      <div
        className="rise relative flex flex-col items-center"
        style={{ "--rise-delay": `${delay}s` } as React.CSSProperties}
      >
      {current && (
        <div className="absolute -top-7 z-10 border-2 border-(--accent) bg-bg px-2 py-0.5 font-display text-[10px] uppercase tracking-widest text-(--accent)">
          {boss ? "fight" : "start"}
          <div className="absolute left-1/2 top-full h-2 w-2 -translate-x-1/2 -translate-y-1 rotate-45 border-b-2 border-r-2 border-(--accent) bg-bg" />
        </div>
      )}

      <motion.button
        whileTap={locked ? { x: [0, -5, 5, -3, 0] } : { scale: 0.9 }}
        onClick={onSelect}
        aria-label={`${node.title} — ${node.state}`}
        className={`relative flex items-center justify-center border-4 text-3xl transition-colors ${
          boss ? "h-24 w-24" : "h-[76px] w-[76px]"
        } ${
          done
            ? "border-black bg-(--accent) text-black"
            : current
              ? "border-(--accent) bg-panel"
              : "border-line bg-panel opacity-40 grayscale"
        }`}
        style={{
          boxShadow: locked ? "none" : "5px 5px 0 rgba(0,0,0,.55)",
        }}
      >
        {current && (
          <span
            className="absolute -inset-2 animate-ping border-2 border-(--accent) opacity-40"
            aria-hidden
          />
        )}
        <span className={current ? "glyph-float" : ""} style={{ "--gf-t": "4s" } as React.CSSProperties}>
          {locked && !boss ? "🔒" : node.emoji}
        </span>
        {done && (
          <span className="absolute -right-2 -top-2 border-2 border-black bg-good px-1 font-display text-xs text-black">
            ✓
          </span>
        )}
      </motion.button>

      <div className="mt-1.5 font-display text-[10px] uppercase tracking-widest opacity-60">
        {node.title}
      </div>
        {done && node.kind === "unit" && (
          <div className="text-xs tracking-widest text-(--accent)">
            {"★".repeat(node.stars ?? 0)}
            <span className="opacity-30">{"★".repeat(3 - (node.stars ?? 0))}</span>
          </div>
        )}
      </div>
    </div>
  );
}
