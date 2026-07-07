import { Suspense } from "react";
import { PageHeader } from "@/components/PageHeader";
import { DrawBoard, type DrawItem } from "@/components/DrawBoard";
import hiragana from "@/data/hiragana.json";
import katakana from "@/data/katakana.json";
import kanji from "@/data/kanji.json";
import type { Kana, Kanji } from "@/lib/types";

function buildItems(): DrawItem[] {
  const kana = (list: Kana[], set: "hiragana" | "katakana"): DrawItem[] =>
    list.map((k) => ({ char: k.char, reading: k.romaji, meaning: "", set }));
  const kj = (kanji as Kanji[]).map(
    (k): DrawItem => ({
      char: k.kanji,
      reading: [...k.onyomi, ...k.kunyomi][0] ?? "",
      meaning: k.meaning,
      set: "kanji",
      strokes: k.strokes,
    })
  );
  return [...kana(hiragana as Kana[], "hiragana"), ...kana(katakana as Kana[], "katakana"), ...kj];
}

const items = buildItems();

export default function DrawPage() {
  return (
    <>
      <PageHeader
        title="Draw"
        jp="✎"
        subtitle="Practice writing kana and kanji by tracing them stroke by stroke."
      />
      <div className="px-4">
        <Suspense fallback={<div className="py-16 text-center text-sm text-muted">Loading…</div>}>
          <DrawBoard items={items} />
        </Suspense>
      </div>
    </>
  );
}
