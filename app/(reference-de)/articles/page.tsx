import { PageHeader } from "@/components/PageHeader";
import { ArticleTrainer } from "@/components/ArticleTrainer";
import vocabA1 from "@/data/goethe_a1.json";
import vocabA2 from "@/data/goethe_a2.json";

interface RawVocab {
  word: string;
  article?: "der" | "die" | "das";
  plural?: string;
  meaning: string;
  pos: string;
  tip?: string;
}

const nouns = ([...vocabA1, ...vocabA2] as RawVocab[])
  .filter((v): v is RawVocab & { article: "der" | "die" | "das" } => v.pos === "noun" && !!v.article)
  .map((v) => ({
    word: v.word,
    article: v.article,
    plural: v.plural,
    meaning: v.meaning,
    tip: v.tip,
  }));

export default function ArticlesPage() {
  return (
    <>
      <PageHeader
        title="Articles"
        jp="d/d/d"
        subtitle="German's biggest challenge — der, die, or das? Practice with every noun in the Goethe A1 + A2 set."
      />
      <div className="px-4">
        <ArticleTrainer nouns={nouns} />
      </div>
    </>
  );
}
