import { Nav } from "@/components/Nav";

// The default zone: the Home dashboard plus the beginner Japanese reference.
// Its own calm chrome (bottom tab bar), scoped to these routes only so the
// scrolling feed at /reels keeps its full-screen look.
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
      {children}
      <Nav />
    </div>
  );
}
