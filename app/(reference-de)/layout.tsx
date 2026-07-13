import { NavDe } from "@/components/NavDe";

// German reference zone — calm chrome with bottom tab bar, scoped so the
// scrolling feed keeps its full-screen look. Mirrors (reference)/layout.tsx.
export default function ReferenceDeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      className="mx-auto flex min-h-dvh max-w-3xl flex-col pb-20 select-text"
      style={{ fontFamily: "var(--font-ui)" }}
    >
      {children}
      <NavDe />
    </div>
  );
}
