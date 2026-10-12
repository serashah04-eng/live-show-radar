"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

export interface MenuLink {
  href: string;
  label: string;
  hint?: string;
}

/** Full-screen menu with big numbered links. Closes on Esc, on navigation, and when the backdrop is clicked. */
export function MenuOverlay({ links, signOutAction, email }: { links: MenuLink[]; signOutAction?: () => Promise<void>; email?: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  return (
    <>
      <button type="button" className="btn-ghost min-h-10 px-5 tracking-widest" onClick={() => setOpen(true)} aria-haspopup="dialog">
        MENU
      </button>
      <dialog
        ref={ref}
        aria-label="Menu"
        onClose={() => setOpen(false)}
        onClick={(e) => e.target === ref.current && setOpen(false)}
        className="m-0 h-full max-h-none w-full max-w-none bg-charcoal p-0 text-offwhite backdrop:bg-black/80"
      >
        <div className="wrap flex h-full flex-col py-5">
          <div className="flex items-center justify-between">
            <span className="mono">Menu</span>
            <button type="button" className="btn-ghost min-h-10 px-5" onClick={() => setOpen(false)} autoFocus>Close</button>
          </div>
          <nav aria-label="Menu links" className="mt-6 flex-1 overflow-y-auto">
            <ul>
              {links.map((l, i) => (
                <li key={l.href} className="border-t border-line">
                  <Link href={l.href} onClick={() => setOpen(false)} className="group flex items-baseline gap-4 py-4 hover:text-lime">
                    <span className="mono w-8">{String(i + 1).padStart(2, "0")}</span>
                    <span className="display text-4xl sm:text-6xl">{l.label}</span>
                    {l.hint && <span className="mono ml-auto hidden sm:inline">{l.hint}</span>}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          {signOutAction && (
            <form action={signOutAction} className="flex items-center justify-between border-t border-line pt-4">
              <span className="mono">{email}</span>
              <button className="btn-ghost" type="submit">Sign out</button>
            </form>
          )}
        </div>
      </dialog>
    </>
  );
}
