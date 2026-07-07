import { PageHeader } from "@/components/PageHeader";
import { KanaViewer } from "@/components/KanaViewer";
import data from "@/data/katakana.json";
import type { Kana } from "@/lib/types";

const choonpuNote = (
  <>
    <div className="mb-1 font-semibold text-ink">
      About the long-vowel mark <span className="jp text-accent">ー</span> (chōonpu)
    </div>
    In katakana, a long vowel is written with a single dash <span className="jp">ー</span>,
    not by repeating a vowel. So <span className="jp">コーヒー</span> is{" "}
    <span className="romaji">kōhī</span> (coffee) — the <span className="jp">ー</span> stretches
    the sound before it. It&apos;s written vertically as a vertical line. Hiragana does not
    use this mark; it repeats vowels instead (e.g. <span className="jp">おかあさん</span>).
  </>
);

export default function KatakanaPage() {
  return (
    <>
      <PageHeader
        title="Katakana"
        jp="ア"
        subtitle="The second alphabet — used for foreign/loanwords. Same sounds as hiragana. Examples here are loanwords."
      />
      <div className="px-4">
        <KanaViewer kind="katakana" data={data as Kana[]} note={choonpuNote} />
      </div>
    </>
  );
}
