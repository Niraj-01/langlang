import { PageHeader } from "@/components/PageHeader";
import { KanaViewer } from "@/components/KanaViewer";
import data from "@/data/hiragana.json";
import type { Kana } from "@/lib/types";

export default function HiraganaPage() {
  return (
    <>
      <PageHeader
        title="Hiragana"
        jp="あ"
        subtitle="The first alphabet — used for native Japanese words and grammar. Tap any character for an example."
      />
      <div className="px-4">
        <KanaViewer kind="hiragana" data={data as Kana[]} />
      </div>
    </>
  );
}
