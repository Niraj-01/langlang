"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "./Icon";

const TABS = [
  { href: "/learn-de", label: "Home", short: "Home", icon: "DE" },
  { href: "/alphabet", label: "Alphabet", short: "ABC", icon: "Ää" },
  { href: "/articles", label: "Articles", short: "d/d/d", icon: "der" },
  { href: "/vocab-de", label: "Vocab", short: "Vocab", icon: "W" },
  { href: "/phrases-de", label: "Phrases", short: "Phrase", icon: "»«" },
  { href: "/grammar-de", label: "Grammar", short: "Gram", icon: "＿" },
  { href: "/translate-de", label: "Translate", short: "Trans", icon: "⇄" },
];

export function NavDe() {
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
              <span
                className={`text-lg leading-none transition-transform duration-200 ${
                  active ? "scale-125 font-bold" : "opacity-80"
                }`}
                style={{ fontFamily: "var(--font-ui)" }}
              >
                {t.icon}
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
          <Icon name="play" size={18} />
          <span className="w-full truncate text-center">Reels</span>
        </Link>
      </div>
    </nav>
  );
}
