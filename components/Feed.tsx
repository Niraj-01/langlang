"use client";

// The Doomscroll: one infinite vertical snap feed. Everything is a card.

import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { FeedItem } from "@/lib/types";
import { useApp, recordBestCombo } from "@/lib/store";
import { nextFeedItem, type FeedContext } from "@/lib/feed";
import { setMuted } from "@/lib/audio";
import { Hud } from "./Hud";
import { ReviewCard } from "./cards/ReviewCard";
import { NewWordCard } from "./cards/NewWordCard";
import { QuizCard } from "./cards/QuizCard";
import { GrammarCard } from "./cards/GrammarCard";
import { ListenCard } from "./cards/ListenCard";
import { SentenceCard } from "./cards/SentenceCard";
import { SpeakCard } from "./cards/SpeakCard";
import { MemeCard } from "./cards/MemeCard";
import { StatusCard } from "./cards/StatusCard";

const LOOKAHEAD = 3;

export function Feed() {
  const state = useApp();
  const [mounted, setMounted] = useState(false);
  const [items, setItems] = useState<FeedItem[]>([]);
  const [combo, setCombo] = useState(0);
  const comboRef = useRef(0);
  const answered = useRef<Map<string, boolean>>(new Map());
  const containerRef = useRef<HTMLDivElement>(null);
  const activeIndex = useRef(0);
  const lastWasFail = useRef(false);

  const multiplier = combo >= 10 ? 3 : combo >= 5 ? 2 : 1;

  const [packToast, setPackToast] = useState(false);
  const prevPacks = useRef(state.packs);

  useEffect(() => setMounted(true), []);
  useEffect(() => setMuted(!state.sound), [state.sound]);
  useEffect(() => {
    if (state.packs > prevPacks.current) {
      setPackToast(true);
      const t = setTimeout(() => setPackToast(false), 3200);
      prevPacks.current = state.packs;
      return () => clearTimeout(t);
    }
    prevPacks.current = state.packs;
  }, [state.packs]);

  const buildContext = useCallback(
    (queue: FeedItem[]): FeedContext => {
      const pending = queue.filter((it) => !answered.current.has(it.id));
      const queuedCardIds = new Set<string>();
      let queuedNewCount = 0;
      for (const it of pending) {
        if (it.kind === "review") queuedCardIds.add(it.cardId);
        if (it.kind === "new") queuedNewCount++;
      }
      let sinceStatus = queue.length;
      for (let i = queue.length - 1; i >= 0; i--) {
        if (queue[i].kind === "status") {
          sinceStatus = queue.length - 1 - i;
          break;
        }
      }
      return {
        recentKinds: queue.slice(-2).map((it) => it.kind),
        queuedCardIds,
        queuedNewCount,
        lastWasFail: lastWasFail.current,
        sinceStatus,
      };
    },
    []
  );

  const append = useCallback(
    (queue: FeedItem[], n: number): FeedItem[] => {
      let next = queue;
      for (let i = 0; i < n; i++) {
        next = [...next, nextFeedItem(state, buildContext(next))];
      }
      return next;
    },
    [state, buildContext]
  );

  // (re)seed the queue on mount and whenever the language flips
  useEffect(() => {
    if (!mounted) return;
    answered.current = new Map();
    lastWasFail.current = false;
    activeIndex.current = 0;
    comboRef.current = 0;
    setCombo(0);
    setItems(append([], LOOKAHEAD + 1));
    containerRef.current?.scrollTo({ top: 0 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted, state.lang]);

  const advance = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    el.scrollTo({
      top: (activeIndex.current + 1) * el.clientHeight,
      behavior: "smooth",
    });
  }, []);

  const onAnswered = useCallback(
    (itemId: string) => (correct: boolean) => {
      if (answered.current.has(itemId)) return;
      answered.current.set(itemId, correct);
      lastWasFail.current = !correct;
      const next = correct ? comboRef.current + 1 : 0;
      comboRef.current = next;
      recordBestCombo(next);
      setCombo(next);
      setTimeout(advance, correct ? 750 : 1100);
    },
    [advance]
  );

  const onScroll = useCallback(() => {
    const el = containerRef.current;
    if (!el || el.clientHeight === 0) return;
    const idx = Math.round(el.scrollTop / el.clientHeight);
    activeIndex.current = idx;
    setItems((queue) =>
      queue.length - idx <= LOOKAHEAD ? append(queue, LOOKAHEAD) : queue
    );
  }, [append]);

  if (!mounted) {
    return (
      <div className="lang-ja flex h-dvh items-center justify-center bg-bg">
        <div className="font-display animate-pulse text-3xl text-(--accent)">
          langlang
        </div>
      </div>
    );
  }

  return (
    <div className={state.lang === "ja" ? "lang-ja" : "lang-de"}>
      <Hud state={state} combo={combo} multiplier={multiplier} />
      <AnimatePresence>
        {packToast && (
          <motion.a
            href="/profile"
            initial={{ y: -60, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -60, opacity: 0 }}
            className="fixed inset-x-0 top-16 z-30 mx-auto w-fit border-2 border-yellow-300 bg-panel px-4 py-2 font-display text-sm text-yellow-300"
            style={{ boxShadow: "4px 4px 0 rgba(0,0,0,0.6)" }}
          >
            QUEST CLEARED — CARD PACK EARNED · tap to open
          </motion.a>
        )}
      </AnimatePresence>
      <div
        ref={containerRef}
        onScroll={onScroll}
        className="h-dvh snap-y snap-mandatory overflow-y-auto overscroll-contain bg-bg"
      >
        {items.map((item) => (
          <section key={item.id} className="h-dvh snap-start">
            <FeedCard
              item={item}
              combo={combo}
              multiplier={multiplier}
              onAnswered={onAnswered(item.id)}
            />
          </section>
        ))}
      </div>
    </div>
  );
}

function FeedCard({
  item,
  combo,
  multiplier,
  onAnswered,
}: {
  item: FeedItem;
  combo: number;
  multiplier: number;
  onAnswered: (correct: boolean) => void;
}) {
  const state = useApp();
  switch (item.kind) {
    case "review": {
      const card = state.cards.find((c) => c.id === item.cardId);
      if (!card) return <StatusCard state={state} />;
      return (
        <ReviewCard
          card={card}
          furigana={state.furigana}
          combo={combo}
          multiplier={multiplier}
          onAnswered={onAnswered}
        />
      );
    }
    case "new":
      return (
        <NewWordCard
          lang={state.lang}
          entryIndex={item.entryIndex}
          furigana={state.furigana}
          onAnswered={onAnswered}
        />
      );
    case "quiz": {
      const card = state.cards.find((c) => c.id === item.cardId);
      if (!card) return <StatusCard state={state} />;
      return (
        <QuizCard
          card={card}
          options={item.options}
          answer={item.answer}
          furigana={state.furigana}
          combo={combo}
          multiplier={multiplier}
          onAnswered={onAnswered}
        />
      );
    }
    case "grammar":
      return (
        <GrammarCard
          item={item.item}
          furigana={state.furigana}
          combo={combo}
          multiplier={multiplier}
          onAnswered={onAnswered}
        />
      );
    case "listen": {
      const card = state.cards.find((c) => c.id === item.cardId);
      if (!card) return <StatusCard state={state} />;
      return (
        <ListenCard
          card={card}
          options={item.options}
          answer={item.answer}
          pair={item.pair}
          furigana={state.furigana}
          combo={combo}
          multiplier={multiplier}
          onAnswered={onAnswered}
        />
      );
    }
    case "sentence":
      return (
        <SentenceCard
          lang={state.lang}
          sentenceIdx={item.sentenceIdx}
          unknownSeedIndex={item.unknownSeedIndex}
          furigana={state.furigana}
          combo={combo}
          multiplier={multiplier}
          onAnswered={onAnswered}
        />
      );
    case "speak":
      return (
        <SpeakCard
          lang={state.lang}
          target={item.target}
          furigana={state.furigana}
          combo={combo}
          multiplier={multiplier}
          onAnswered={onAnswered}
        />
      );
    case "meme":
      return (
        <MemeCard
          lang={state.lang}
          word={item.word}
          reading={item.reading}
          meaning={item.meaning}
          furigana={state.furigana}
          combo={combo}
          onAnswered={onAnswered}
        />
      );
    case "status":
      return <StatusCard state={state} />;
  }
}
