import { PageHeader } from "@/components/PageHeader";
import { RadicalsViewer } from "@/components/RadicalsViewer";
import data from "@/data/radicals.json";
import type { Radical } from "@/lib/types";

export default function RadicalsPage() {
  return (
    <>
      <PageHeader
        title="Radicals"
        jp="部"
        subtitle="The building blocks of kanji. Learn the parts first — then every kanji is a story made of pieces you already know."
      />
      <div className="px-4">
        <RadicalsViewer data={data as Radical[]} />
      </div>
    </>
  );
}
