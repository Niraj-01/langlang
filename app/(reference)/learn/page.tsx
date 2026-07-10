import { Dashboard, type DashLoan } from "@/components/Dashboard";
import hiragana from "@/data/hiragana.json";
import katakana from "@/data/katakana.json";
import kanjiData from "@/data/kanji.json";
import phrasesData from "@/data/phrases.json";
import type { Kana, Kanji, Phrase } from "@/lib/types";

// Rotate the "of the day" picks once a day. Regenerated hourly so the day
// turns over without going fully dynamic.
export const revalidate = 3600;

const LOAN_CHARS = ["コ", "タ", "カ"]; // coffee / taxi / camera

export default function HomePage() {
  const day = Math.floor(Date.now() / 86_400_000);

  const basics = (hiragana as Kana[]).filter((k) => k.type === "basic");
  const hero = basics[day % basics.length];
  const kana10 = basics.slice(0, 10).map((k) => ({ char: k.char, romaji: k.romaji }));

  const kata = katakana as Kana[];
  const loans: DashLoan[] = LOAN_CHARS.map((c) => kata.find((k) => k.char === c))
    .filter((k): k is Kana => !!k?.example)
    .map((k) => ({ jp: k.example!.word, romaji: k.example!.romaji, en: k.example!.meaning }));

  const all = kanjiData as Kanji[];
  const k = all[day % all.length];
  const kanji = {
    kanji: k.kanji,
    meaning: k.meaning,
    strokes: k.strokes,
    onyomi: k.onyomi,
    kunyomi: k.kunyomi,
    example: k.examples[0],
  };

  const phrases = (phrasesData as Phrase[])
    .filter((p) => p.category === "greetings" || p.category === "politeness")
    .slice(0, 6)
    .map((p) => ({ japanese: p.japanese, romaji: p.romaji, english: p.english }));

  return (
    <Dashboard
      hero={{ char: hero.char, romaji: hero.romaji }}
      kana10={kana10}
      loans={loans}
      kanji={kanji}
      phrases={phrases}
    />
  );
}
