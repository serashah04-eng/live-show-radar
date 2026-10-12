"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ITEMS = [
  { href: "/", label: "Home", icon: "🏠" },
  { href: "/feed", label: "Calendar", icon: "🎫" },
  { href: "/search", label: "Search", icon: "🔎" },
  { href: "/favourites", label: "Favourites", icon: "❤️" },
  { href: "/artists", label: "Artists", icon: "🎤" },
];

/** Thumb-friendly tab bar for phones. Hidden on larger screens, where the top bar is used. */
export function BottomNav() {
  const path = usePathname();
  if (path.startsWith("/auth") || path.startsWith("/guest")) return null;
  return (
    <nav aria-label="Quick navigation" className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface/95 backdrop-blur lg:hidden">
      <ul className="mx-auto grid max-w-md grid-cols-5">
        {ITEMS.map((i) => {
          const on = i.href === "/" ? path === "/" : path === i.href || path.startsWith(`${i.href}/`);
          return (
            <li key={i.href}>
              <Link href={i.href} aria-current={on ? "page" : undefined} className={`flex flex-col items-center gap-0.5 py-2 text-[10px] font-semibold ${on ? "text-lime" : "muted"}`}>
                <span className={`text-lg leading-none ${on ? "" : "opacity-70"}`} aria-hidden="true">{i.icon}</span>
                {i.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
