import { GermanDashboard, type DashDeWord, type DashDePhrase } from "@/components/GermanDashboard";
import vocabA1 from "@/data/goethe_a1.json";
import phrasesDeData from "@/data/phrases_de.json";

// Rotate the "of the day" picks once a day. Regenerated hourly so the day
// turns over without going fully dynamic.
export const revalidate = 3600;

interface RawVocab {
  word: string;
  article?: "der" | "die" | "das";
  plural?: string;
  meaning: string;
  pos: string;
  example?: string;
  exampleMeaning?: string;
  tip?: string;
}

interface RawPhrase {
  german: string;
  english: string;
  category: string;
  pronunciation: string;
}

export default function GermanHomePage() {
  const day = Math.floor(Date.now() / 86_400_000);
  const all = vocabA1 as RawVocab[];

  // Pick a noun for the hero (so it has an article)
  const nouns = all.filter((v) => v.pos === "noun" && v.article);
  const hero: DashDeWord = nouns[day % nouns.length];

  // 10 nouns with articles for the grid
  const nouns10: DashDeWord[] = nouns.slice(0, 10);

  // Phrases — greetings + politeness
  const phrases: DashDePhrase[] = (phrasesDeData as RawPhrase[])
    .filter((p) => p.category === "greetings" || p.category === "politeness")
    .slice(0, 8)
    .map((p) => ({ german: p.german, english: p.english }));

  return (
    <GermanDashboard
      hero={hero}
      nouns10={nouns10}
      phrases={phrases}
    />
  );
}
