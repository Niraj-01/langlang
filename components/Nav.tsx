"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/hiragana", label: "Hiragana", jp: "あ" },
  { href: "/katakana", label: "Katakana", jp: "ア" },
  { href: "/kanji", label: "Kanji", jp: "字" },
  { href: "/phrases", label: "Phrases", jp: "話" },
  { href: "/draw", label: "Draw", jp: "✎" },
  { href: "/translate", label: "Translate", jp: "訳" },
];

export function Nav() {
  const path = usePathname();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface/95 backdrop-blur">
      <div className="mx-auto flex max-w-3xl">
        {TABS.map((t) => {
          const active = path === t.href || (path === "/" && t.href === "/hiragana");
          return (
            <Link
              key={t.href}
              href={t.href}
              className={`flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[10px] font-medium transition-colors ${
                active ? "text-accent" : "text-muted hover:text-ink"
              }`}
            >
              <span className={`jp text-lg leading-none ${active ? "" : "opacity-80"}`}>
                {t.jp}
              </span>
              <span className="uppercase tracking-wide">{t.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
