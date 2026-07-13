import { PageHeader } from "@/components/PageHeader";
import { TranslateDe } from "@/components/TranslateDe";

export default function TranslateDePage() {
  return (
    <>
      <PageHeader
        title="Translate"
        jp="⇄"
        subtitle="English ⇄ German. Every result shows the translation clearly so you can read along."
      />
      <div className="px-4">
        <TranslateDe />
      </div>
    </>
  );
}
