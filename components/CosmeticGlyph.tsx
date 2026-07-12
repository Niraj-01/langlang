// Pet cosmetics drawn as clean SVG line-art (the professional replacement for
// emoji wearables). Shared by the Pet overlay and the closet preview so both
// always match. viewBox is 100×100, centered, so callers just size it.

const GLYPHS: Record<string, React.ReactNode> = {
  beanie: (
    <>
      <path d="M25 55c0-18 11-30 25-30s25 12 25 30" fill="#2b303b" stroke="#111" strokeWidth="4" />
      <rect x="20" y="53" width="60" height="10" rx="5" fill="#48c78e" stroke="#111" strokeWidth="4" />
      <circle cx="50" cy="25" r="6" fill="#48c78e" stroke="#111" strokeWidth="4" />
    </>
  ),
  crown: (
    <path
      d="M24 60V38l13 11 13-19 13 19 13-11v22z"
      fill="#f5c542"
      stroke="#111"
      strokeWidth="4"
      strokeLinejoin="round"
    />
  ),
  halo: <ellipse cx="50" cy="30" rx="26" ry="9" fill="none" stroke="#f5c542" strokeWidth="6" />,
  bow: (
    <>
      <path d="M50 50l-24-12v24z" fill="#ff5c7a" stroke="#111" strokeWidth="4" strokeLinejoin="round" />
      <path d="M50 50l24-12v24z" fill="#ff5c7a" stroke="#111" strokeWidth="4" strokeLinejoin="round" />
      <circle cx="50" cy="50" r="7" fill="#ff5c7a" stroke="#111" strokeWidth="4" />
    </>
  ),
  shades: (
    <>
      <rect x="22" y="42" width="24" height="16" rx="4" fill="#111" />
      <rect x="54" y="42" width="24" height="16" rx="4" fill="#111" />
      <path d="M46 48h8" stroke="#111" strokeWidth="4" />
    </>
  ),
  scarf: (
    <>
      <rect x="26" y="46" width="48" height="12" rx="6" fill="#d8f000" stroke="#111" strokeWidth="4" />
      <path d="M60 56l6 22 10-4-6-20z" fill="#d8f000" stroke="#111" strokeWidth="4" strokeLinejoin="round" />
    </>
  ),
};

export function CosmeticGlyph({ id, size = 100 }: { id: string; size?: number }) {
  const g = GLYPHS[id];
  if (!g) return null;
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} aria-hidden="true">
      {g}
    </svg>
  );
}
