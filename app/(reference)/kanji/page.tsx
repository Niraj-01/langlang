import { PageHeader } from "@/components/PageHeader";
import { KanjiViewer } from "@/components/KanjiViewer";
import data from "@/data/kanji.json";
import type { Kanji } from "@/lib/types";

export default function KanjiPage() {
  return (
    <>
      <PageHeader
        title="Kanji"
        jp="字"
        subtitle="The essential JLPT N5 set — the first ~100 kanji every beginner learns. Search or browse by category."
      />
      <div className="px-4">
        <KanjiViewer data={data as Kanji[]} />
      </div>
    </>
  );
}
