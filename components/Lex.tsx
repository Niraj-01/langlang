"use client";

// Shared lexical renderers: furigana ruby for Japanese,
// color-coded articles for German nouns (der=blue, die=red, das=green — always).

import type { Card, VocabEntry } from "@/lib/types";

export const ARTICLE_COLOR: Record<string, string> = {
  der: "text-der",
  die: "text-die",
  das: "text-das",
};

export function JaWord({
  word,
  reading,
  furigana,
  className = "",
}: {
  word: string;
  reading?: string;
  furigana: boolean;
  className?: string;
}) {
  if (furigana && reading && reading !== word) {
    return (
      <ruby className={`font-jp ${className}`}>
        {word}
        <rt className="text-[0.4em] opacity-70">{reading}</rt>
      </ruby>
    );
  }
  return <span className={`font-jp ${className}`}>{word}</span>;
}

export function DeNoun({
  entry,
  className = "",
}: {
  entry: Pick<Card | VocabEntry, "word" | "article" | "plural">;
  className?: string;
}) {
  if (!entry.article) return <span className={className}>{entry.word}</span>;
  return (
    <span className={className}>
      <span className={ARTICLE_COLOR[entry.article]}>{entry.article}</span>{" "}
      {entry.word}
    </span>
  );
}

export function DePlural({
  entry,
}: {
  entry: Pick<Card | VocabEntry, "article" | "plural">;
}) {
  if (!entry.article || !entry.plural) return null;
  return (
    <div className="text-sm uppercase tracking-widest opacity-60">
      pl. <span className="text-die">die</span> {entry.plural}
    </div>
  );
}

/** Example sentence block, language-aware. */
export function Example({
  entry,
  lang,
  furigana,
}: {
  entry: Pick<Card | VocabEntry, "example" | "exampleReading" | "exampleMeaning">;
  lang: "ja" | "de";
  furigana: boolean;
}) {
  if (!entry.example) return null;
  return (
    <div className="mt-6 border-l-4 border-line pl-4 text-left">
      <div className={`text-xl leading-relaxed ${lang === "ja" ? "font-jp" : ""}`}>
        {entry.example}
      </div>
      {lang === "ja" && furigana && entry.exampleReading && (
        <div className="font-jp mt-1 text-sm opacity-50">{entry.exampleReading}</div>
      )}
      {entry.exampleMeaning && (
        <div className="mt-1 text-sm italic opacity-60">{entry.exampleMeaning}</div>
      )}
    </div>
  );
}
