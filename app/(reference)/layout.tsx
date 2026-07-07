import Link from "next/link";
import { Nav } from "@/components/Nav";

// The "Learn" zone — the beginner Japanese reference. Its own calm chrome
// (bottom tab bar + a link back to the feed), scoped to these routes only so
// the main langlang feed keeps its full-screen look.
export default function ReferenceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      className="mx-auto flex min-h-dvh max-w-3xl flex-col pb-20 select-text"
      style={{ fontFamily: "var(--font-ui)" }}
    >
      <div className="flex items-center justify-between px-4 pt-4">
        <Link href="/" className="text-xs uppercase tracking-widest text-muted hover:text-ink">
          ← langlang feed
        </Link>
        <span className="text-xs uppercase tracking-widest text-muted/60">Learn</span>
      </div>
      {children}
      <Nav />
    </div>
  );
}
