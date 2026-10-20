import { PageHeader } from "@/components/PageHeader";
import { GrammarGuide } from "@/components/GrammarGuide";
import { GRAMMAR_POINTS_JA } from "@/lib/grammar";
import drills from "@/data/grammar_ja.json";
import type { GrammarItem } from "@/lib/types";

export default function GrammarPage() {
  // each pattern's practice set = the feed/lesson drills tagged with its id
  const byPattern: Record<string, GrammarItem[]> = {};
  for (const d of drills as GrammarItem[]) {
    if (d.pattern) (byPattern[d.pattern] ??= []).push(d);
  }

  return (
    <>
      <PageHeader
        title="Grammar"
        jp="文"
        subtitle="The JLPT N5 patterns in the order to learn them. Each one has the rule, real examples, and a quick check."
      />
      <div className="px-4">
        <GrammarGuide points={GRAMMAR_POINTS_JA} drills={byPattern} />
      </div>
    </>
  );
}
