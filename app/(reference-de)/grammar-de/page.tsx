import { PageHeader } from "@/components/PageHeader";
import { GrammarDrills } from "@/components/GrammarDrills";
import data from "@/data/grammar_de.json";

export default function GrammarPage() {
  return (
    <>
      <PageHeader
        title="Grammar"
        jp="＿"
        subtitle="Fill-in-the-blank drills for German articles, cases, and prepositions. Each answer shows the 'why'."
      />
      <div className="px-4">
        <GrammarDrills data={data} />
      </div>
    </>
  );
}
