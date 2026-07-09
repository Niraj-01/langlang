"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// `short` keeps eight tabs legible at 390px; the full label returns on sm+.
const TABS = [
  { href: "/", label: "Home", short: "Home", jp: "ホ" },
  { href: "/hiragana", label: "Hiragana", short: "Hira", jp: "あ" },
  { href: "/katakana", label: "Katakana", short: "Kata", jp: "ア" },
  { href: "/kanji", label: "Kanji", short: "Kanji", jp: "水" },
  { href: "/phrases", label: "Phrases", short: "Phrase", jp: "話" },
  { href: "/draw", label: "Draw", short: "Draw", jp: "筆" },
  { href: "/translate", label: "Translate", short: "Trans", jp: "訳" },
];

export function Nav() {
  const path = usePathname();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface/95 backdrop-blur">
      <div className="mx-auto flex max-w-3xl">
        {TABS.map((t) => {
          const active = path === t.href;
          return (
            <Link
              key={t.href}
              href={t.href}
              className={`flex min-w-0 flex-1 flex-col items-center gap-0.5 py-2.5 text-[9px] font-bold uppercase tracking-tight transition-colors sm:tracking-wide ${
                active ? "text-accent" : "text-muted hover:text-ink"
              }`}
            >
              <span className={`jp text-lg leading-none ${active ? "" : "opacity-80"}`}>
                {t.jp}
              </span>
              <span className="w-full truncate text-center sm:hidden">{t.short}</span>
              <span className="hidden w-full truncate text-center sm:inline">{t.label}</span>
            </Link>
          );
        })}

        {/* Reels — the scrolling Doomscroll, always one tap away */}
        <Link
          href="/reels"
          className="flex min-w-0 flex-1 flex-col items-center gap-0.5 py-2.5 text-[9px] font-bold uppercase tracking-tight text-accent transition hover:brightness-110 sm:tracking-wide"
        >
          <span className="text-lg leading-none">▶</span>
          <span className="w-full truncate text-center">Reels</span>
        </Link>
      </div>
    </nav>
  );
}
