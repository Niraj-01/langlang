import { Suspense } from "react";
import Link from "next/link";
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
        <Link
          href="/radicals"
          className="rise mb-3 inline-flex items-center gap-1.5 rounded-lg border border-line bg-surface px-3 py-2 text-xs font-semibold text-muted transition-colors hover:border-accent hover:text-accent"
        >
          <span className="jp text-sm">部</span> Learn the radicals first →
        </Link>
        <Suspense fallback={<div className="py-16 text-center text-sm text-muted">Loading…</div>}>
          <KanjiViewer data={data as Kanji[]} />
        </Suspense>
      </div>
    </>
  );
}
