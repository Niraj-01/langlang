// Monochrome line-icon set — the professional replacement for emojis across the
// app. Every icon is a stroke drawing in a 24×24 viewBox using currentColor, so
// it inherits text color, sizing, and the accent variable like any glyph.

export type IconName =
  | "home"
  | "play"
  | "map"
  | "user"
  | "volume"
  | "volumeOff"
  | "flame"
  | "heart"
  | "heartOff"
  | "chart"
  | "trophy"
  | "gift"
  | "book"
  | "bookAlert"
  | "target"
  | "focus"
  | "swords"
  | "pickaxe"
  | "pencil"
  | "x"
  | "check"
  | "lock"
  | "star"
  | "layers"
  | "bell"
  | "bulb"
  | "spark"
  | "arrowLeft"
  | "arrowRight"
  | "plus"
  | "repeat"
  | "torii"
  | "calendar"
  | "clock"
  | "search"
  | "leaf"
  | "flag"
  | "bolt"
  | "medal"
  | "diamond"
  | "grid"
  | "sun"
  | "share"
  | "mic"
  | "chat"
  | "eye"
  | "dice"
  | "sound";

const P: Record<IconName, React.ReactNode> = {
  home: <path d="M3 11l9-8 9 8M5 10v10h5v-6h4v6h5V10" />,
  play: <path d="M7 4l13 8-13 8V4z" />,
  map: <path d="M9 4L3 6v14l6-2 6 2 6-2V4l-6 2-6-2zM9 4v14M15 6v14" />,
  user: (
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c0-4 4-6 8-6s8 2 8 6" />
    </>
  ),
  volume: <path d="M4 9v6h4l5 4V5L8 9H4zM17 8a5 5 0 010 8M20 5a9 9 0 010 14" />,
  volumeOff: <path d="M4 9v6h4l5 4V5L8 9H4zM17 9l6 6M23 9l-6 6" />,
  sound: <path d="M4 9v6h4l5 4V5L8 9H4zM17 8a5 5 0 010 8M20 5a9 9 0 010 14" />,
  flame: <path d="M12 2c1 4 5 5 5 10a5 5 0 01-10 0c0-2 1-3 2-4 0 2 1 3 2 3 0-3-1-5 1-9z" />,
  heart: <path d="M12 21C5 15 3 11 5 7c1.5-3 6-3 7 1 1-4 5.5-4 7-1 2 4 0 8-7 14z" fill="currentColor" stroke="none" />,
  heartOff: <path d="M12 21C5 15 3 11 5 7c1.5-3 6-3 7 1 1-4 5.5-4 7-1 2 4 0 8-7 14z" />,
  chart: <path d="M4 20V4M4 20h16M8 16v-4M12 16V8M16 16v-6M20 16v-2" />,
  trophy: <path d="M7 4h10v4a5 5 0 01-10 0V4zM7 6H4v2a3 3 0 003 3M17 6h3v2a3 3 0 01-3 3M9 15h6M8 20h8M12 15v5" />,
  gift: (
    <>
      <path d="M4 11h16v9H4zM3 7h18v4H3zM12 7v13" />
      <path d="M12 7C10 7 8 6 8 4.5S10 3 12 7zM12 7c2 0 4-1 4-2.5S14 3 12 7z" />
    </>
  ),
  book: <path d="M4 5a2 2 0 012-2h13v16H6a2 2 0 00-2 2V5zM19 3v16" />,
  bookAlert: (
    <>
      <path d="M4 5a2 2 0 012-2h13v16H6a2 2 0 00-2 2V5z" />
      <path d="M11 7h2M11 10h2M12 12.5v.01" />
    </>
  ),
  target: (
    <>
      <circle cx="12" cy="12" r="8" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
  focus: <path d="M4 8V4h4M20 8V4h-4M4 16v4h4M20 16v4h-4M12 12v.01" />,
  swords: <path d="M4 4l8 8M3 8l3 3-2 2 2 2M20 4l-8 8M21 8l-3 3 2 2-2 2M9 15l-4 4M15 15l4 4" />,
  pickaxe: <path d="M4 20l9-9M3 9c3-3 7-4 9-3M21 9c-3-3-7-4-9-3M12 6l0 5" />,
  pencil: <path d="M4 20l4-1 10-10-3-3L5 16l-1 4zM14 6l3 3" />,
  x: <path d="M6 6l12 12M18 6L6 18" />,
  check: <path d="M4 12l5 5L20 6" />,
  lock: (
    <>
      <rect x="5" y="11" width="14" height="9" rx="1.5" />
      <path d="M8 11V8a4 4 0 018 0v3" />
    </>
  ),
  star: <path d="M12 3l2.7 5.5 6 .9-4.4 4.2 1 6L12 17l-5.3 2.6 1-6L3.3 9.4l6-.9L12 3z" />,
  layers: <path d="M12 3l9 5-9 5-9-5 9-5zM3 12l9 5 9-5M3 16l9 5 9-5" />,
  bell: <path d="M6 16V10a6 6 0 0112 0v6l2 2H4l2-2zM10 20a2 2 0 004 0" />,
  bulb: <path d="M9 18h6M10 21h4M8 14a6 6 0 116 0c-1 1-1.5 1.5-1.5 3h-3C9.5 15.5 9 15 8 14z" />,
  spark: <path d="M12 3v6M12 15v6M3 12h6M15 12h6M6 6l3 3M15 15l3 3M18 6l-3 3M9 15l-3 3" />,
  arrowLeft: <path d="M20 12H4M10 6l-6 6 6 6" />,
  arrowRight: <path d="M4 12h16M14 6l6 6-6 6" />,
  plus: <path d="M12 5v14M5 12h14" />,
  repeat: <path d="M4 9a6 6 0 016-6h6l-2-2M20 15a6 6 0 01-6 6H8l2 2M17 3l3 3-3 3M7 21l-3-3 3-3" />,
  torii: <path d="M3 6c3 1 15 1 18 0M4 9h16M6 6v14M18 6v14M4 6l-1-2h18l-1 2" />,
  calendar: (
    <>
      <rect x="4" y="5" width="16" height="16" rx="1.5" />
      <path d="M4 9h16M8 3v4M16 3v4" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="8" />
      <path d="M12 8v4l3 2" />
    </>
  ),
  search: (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="M20 20l-4-4" />
    </>
  ),
  leaf: <path d="M4 20C4 10 12 4 20 4c0 8-6 16-16 16zM4 20c3-4 6-6 10-8" />,
  flag: <path d="M5 21V4M5 4h13l-2 4 2 4H5" />,
  bolt: <path d="M13 2L4 14h6l-1 8 9-12h-6l1-8z" />,
  medal: (
    <>
      <path d="M8 3l2 6M16 3l-2 6" />
      <circle cx="12" cy="15" r="6" />
      <path d="M12 12v6M9.5 14.5l5 1" />
    </>
  ),
  diamond: <path d="M6 3h12l3 5-9 13L3 8l3-5zM3 8h18M9 3l3 18M15 3l-3 18" />,
  grid: <path d="M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z" />,
  sun: (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2" />
    </>
  ),
  share: <path d="M4 12v8h16v-8M12 3v13M7 8l5-5 5 5" />,
  mic: <path d="M12 3a3 3 0 013 3v5a3 3 0 01-6 0V6a3 3 0 013-3zM6 11a6 6 0 0012 0M12 17v4M9 21h6" />,
  chat: <path d="M4 5h16v11H9l-4 4v-4H4zM8 9h8M8 12h5" />,
  eye: (
    <>
      <path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
  dice: (
    <>
      <rect x="4" y="4" width="16" height="16" rx="3" />
      <path d="M9 9v.01M15 15v.01M9 15v.01M15 9v.01M12 12v.01" />
    </>
  ),
};

export function Icon({
  name,
  size = 20,
  className = "",
  strokeWidth = 2,
  style,
}: {
  name: IconName;
  size?: number;
  className?: string;
  strokeWidth?: number;
  style?: React.CSSProperties;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={style}
      aria-hidden="true"
    >
      {P[name]}
    </svg>
  );
}
