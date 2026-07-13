import { PageHeader } from "@/components/PageHeader";
import { VocabDeBrowser } from "@/components/VocabDeBrowser";
import vocabA1 from "@/data/goethe_a1.json";
import vocabA2 from "@/data/goethe_a2.json";

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

const data = ([...vocabA1, ...vocabA2] as RawVocab[]).map((v) => ({
  word: v.word,
  article: v.article as "der" | "die" | "das" | undefined,
  plural: v.plural,
  meaning: v.meaning,
  pos: v.pos,
  example: v.example,
  exampleMeaning: v.exampleMeaning,
  tip: v.tip,
}));

export default function VocabDePage() {
  return (
    <>
      <PageHeader
        title="Vocab"
        jp="W"
        subtitle="All Goethe A1 + A2 vocabulary — browse by category, search, and listen. Nouns show articles color-coded."
      />
      <div className="px-4">
        <VocabDeBrowser data={data} />
      </div>
    </>
  );
}
