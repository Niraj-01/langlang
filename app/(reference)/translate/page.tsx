import { PageHeader } from "@/components/PageHeader";
import { Translate } from "@/components/Translate";

export default function TranslatePage() {
  return (
    <>
      <PageHeader
        title="Translate"
        jp="訳"
        subtitle="English ⇄ Japanese. Every result shows the script, romaji, and English so you can read along."
      />
      <div className="px-4">
        <Translate />
      </div>
    </>
  );
}
