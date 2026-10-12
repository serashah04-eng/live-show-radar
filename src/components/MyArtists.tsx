"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { setFollow } from "@/app/artists/actions";
import { artistImage } from "@/lib/artist-images";

export interface MyArtist {
  id: string;
  name: string;
  genres: string[]; // display names
  next: { id: string; label: string } | null; // next upcoming India show, if any
}

const COLORS = [["#315cff", "#ffffff"], ["#ff7a30", "#151821"], ["#c6d800", "#151821"], ["#2f3649", "#f4f5f7"]];
const colorFor = (name: string) => {
  let h = 0;
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return COLORS[h % COLORS.length];
};
const initials = (n: string) => n.replace(/[^A-Za-z0-9 ]/g, "").split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase() || "?";

/** Your favourite artists: one card each with the next India show (or an honest "none announced"), and a remove button. */
export function MyArtists({ artists }: { artists: MyArtist[] }) {
  const [list, setList] = useState(artists);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const remove = (a: MyArtist) => {
    setError(null);
    setList((l) => l.filter((x) => x.id !== a.id));
    startTransition(async () => {
      const r = await setFollow(a.id, false);
      if (!r.ok) {
        setList((l) => [...l, a].sort((x, y) => x.name.localeCompare(y.name)));
        setError("That didn't save. Check your connection and try again.");
      }
    });
  };

  if (list.length === 0) {
    return (
      <div className="card">
        <p>No favourite artists yet.</p>
        <p className="mt-1 text-sm muted">Add the artists you love. Results and alerts are based only on this list.</p>
        <Link href="/artists?add=1" className="btn-primary mt-3">Add artists</Link>
      </div>
    );
  }
  return (
    <div>
      {error && <p className="notice-err mb-3" role="alert">{error}</p>}
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {list.map((a) => {
          const img = artistImage(a.name)?.url;
          const [bg, fg] = colorFor(a.name);
          return (
            <li key={a.id} className="card flex flex-col items-center !p-4 text-center">
              {img ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={img} alt="" width={96} height={96} loading="lazy" referrerPolicy="no-referrer" className="size-24 rounded-full object-cover" />
              ) : (
                <span aria-hidden="true" className="grid size-24 place-items-center rounded-full text-2xl font-bold" style={{ background: bg, color: fg }}>{initials(a.name)}</span>
              )}
              <p className="mt-2 text-sm font-bold leading-tight">{a.name}</p>
              <span className="mt-1 flex flex-wrap justify-center gap-1">
                {a.genres.slice(0, 2).map((g) => <span key={g} className="rounded-full border border-line px-1.5 py-px text-[10px] muted">{g}</span>)}
              </span>
              <p className="mt-2 text-xs">
                {a.next ? <Link href={`/events/${a.next.id}`} className="text-lime underline underline-offset-2">Next: {a.next.label}</Link> : <span className="muted">No India show announced yet. We keep watching.</span>}
              </p>
              <button type="button" onClick={() => remove(a)} className="mt-3 text-xs muted underline underline-offset-2 hover:text-orange" aria-label={`Remove ${a.name} from my artists`}>Remove</button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
