import { PageHeader } from "@/components/PageHeader";
import { AlphabetViewer } from "@/components/AlphabetViewer";
import data from "@/data/alphabet_de.json";

export default function AlphabetPage() {
  return (
    <>
      <PageHeader
        title="Alphabet"
        jp="Ää"
        subtitle="German uses the Latin alphabet plus three umlauts (ä ö ü) and the Eszett (ß). Some letter combos have special sounds."
      />
      <div className="px-4">
        <AlphabetViewer data={data} />
      </div>
    </>
  );
}
