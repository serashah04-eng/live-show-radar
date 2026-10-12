"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export interface NavItem {
  href: string;
  label: string;
}

/** Top-bar links; the page you are on is highlighted so you always know where you are. */
export function NavLinks({ items }: { items: NavItem[] }) {
  const path = usePathname();
  return (
    <>
      {items.map((l) => {
        const on = l.href === "/" ? path === "/" : path === l.href || path.startsWith(`${l.href}/`);
        return (
          <Link
            key={l.href}
            href={l.href}
            aria-current={on ? "page" : undefined}
            className={`rounded-full px-2.5 py-1.5 text-[13px] ${on ? "bg-lime font-bold text-ink" : "muted hover:text-offwhite"}`}
          >
            {l.label}
          </Link>
        );
      })}
    </>
  );
}
