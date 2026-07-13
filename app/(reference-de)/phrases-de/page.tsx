import { PageHeader } from "@/components/PageHeader";
import { GermanPhrases } from "@/components/GermanPhrases";
import data from "@/data/phrases_de.json";

export default function PhrasesPage() {
  return (
    <>
      <PageHeader
        title="Phrases"
        jp="»«"
        subtitle="Survival German — the everyday phrases you'll actually use. Tap any card to hear it spoken."
      />
      <div className="px-4">
        <GermanPhrases data={data} />
      </div>
    </>
  );
}
