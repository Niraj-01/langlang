import { PageHeader } from "@/components/PageHeader";
import { Phrases } from "@/components/Phrases";
import data from "@/data/phrases.json";
import type { Phrase } from "@/lib/types";

export default function PhrasesPage() {
  return (
    <>
      <PageHeader
        title="Phrases"
        jp="話"
        subtitle="The everyday phrases you'll actually use. Tap any card to hear it spoken."
      />
      <div className="px-4">
        <Phrases data={data as Phrase[]} />
      </div>
    </>
  );
}
