import { PageHeader } from "@/components/PageHeader";
import { Saved } from "@/components/Saved";

export default function SavedPage() {
  return (
    <>
      <PageHeader
        title="Saved"
        jp="心"
        subtitle="Kanji and phrases you hearted — your personal shortlist."
      />
      <Saved />
    </>
  );
}
