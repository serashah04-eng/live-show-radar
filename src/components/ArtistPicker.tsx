"use client";

import { useMemo, useState, useTransition } from "react";
import { setFollow } from "@/app/artists/actions";
import { artistImage } from "@/lib/artist-images";

export interface PickerArtist {
  id: string;
  name: string;
  origin: string | null;
  genres: string[]; // genre slugs
}
export interface PickerGenre {
  slug: string;
  name: string;
}

const ORIGINS: { key: string; label: string }[] = [
  { key: "indian_indie", label: "Indian indie" },
  { key: "bollywood", label: "Bollywood and film" },
  { key: "international", label: "International" },
  { key: "other", label: "Classical and world" },
];
const TILE_COLORS = [
  ["#315cff", "#ffffff"],
  ["#ff7a30", "#151821"],
  ["#c6d800", "#151821"],
  ["#2f3649", "#f4f5f7"],
];
const colorFor = (name: string) => {
  let h = 0;
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return TILE_COLORS[h % TILE_COLORS.length];
};
const initials = (name: string) =>
  name.replace(/[^A-Za-z0-9 ]/g, "").split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase() || "?";

/**
 * Tap to choose. `live` mode saves each tap straight away; `draft` mode only collects the choice
 * as hidden form fields (used inside the onboarding form).
 */
export function ArtistPicker({
  artists,
  genres,
  initialFollowed,
  mode,
  myGenres = [],
}: {
  artists: PickerArtist[];
  genres: PickerGenre[];
  initialFollowed: string[];
  mode: "live" | "draft";
  myGenres?: string[];
}) {
  const [followed, setFollowed] = useState<Set<string>>(new Set(initialFollowed));
  const [q, setQ] = useState("");
  const [genre, setGenre] = useState<string | null>(null);
  const [onlyFollowing, setOnlyFollowing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const genreCounts = useMemo(() => {
    const m = new Map<string, number>();
    for (const a of artists) for (const g of a.genres) m.set(g, (m.get(g) ?? 0) + 1);
    return m;
  }, [artists]);

  const topGenres = useMemo(() => genres.filter((g) => genreCounts.has(g.slug)).sort((x, y) => (genreCounts.get(y.slug) ?? 0) - (genreCounts.get(x.slug) ?? 0)).slice(0, 8), [genres, genreCounts]);

  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return artists.filter((a) => (!needle || a.name.toLowerCase().includes(needle)) && (!genre || a.genres.includes(genre)) && (!onlyFollowing || followed.has(a.id)));
  }, [artists, q, genre, onlyFollowing, followed]);

  const apply = (ids: string[], follow: boolean) =>
    setFollowed((prev) => {
      const next = new Set(prev);
      for (const id of ids) {
        if (follow) next.add(id);
        else next.delete(id);
      }
      return next;
    });

  const toggle = (id: string) => {
    const follow = !followed.has(id);
    setError(null);
    apply([id], follow);
    if (mode === "live")
      startTransition(async () => {
        const r = await setFollow(id, follow);
        if (!r.ok) {
          apply([id], !follow); // undo: the save did not go through
          setError("That didn't save. Check your connection and try again.");
        }
      });
  };

  return (
    <div>
      {mode === "draft" && [...followed].map((id) => <input key={id} type="hidden" name="artists" value={id} />)}

      <div className="flex flex-wrap items-center gap-2">
        <label htmlFor="artist-search" className="sr-only">Search artists</label>
        <input id="artist-search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search artists" className="field max-w-xs" />
        <button type="button" className="pill-tab" aria-pressed={onlyFollowing} onClick={() => setOnlyFollowing(!onlyFollowing)}>Following ({followed.size})</button>
      </div>
      <div className="mt-3 flex gap-2 overflow-x-auto pb-2" role="group" aria-label="Filter by genre">
        <button type="button" className="pill-tab" aria-pressed={genre === null} onClick={() => setGenre(null)}>All</button>
        {topGenres.map((g) => (
          <button key={g.slug} type="button" className="pill-tab" aria-pressed={genre === g.slug} onClick={() => setGenre(genre === g.slug ? null : g.slug)}>{g.name}</button>
        ))}
      </div>

      <p className="mono mt-3" aria-live="polite">
        Showing {shown.length} of {artists.length} artists
      </p>
      {error && <p className="notice-err mt-2" role="alert">{error}</p>}

      {shown.length === 0 ? (
        <p className="card mt-3 muted">No artists match these filters. Clear a filter above, or add the artist below.</p>
      ) : (
        <ul className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-6">
          {shown.map((a) => {
            const [bg, fg] = colorFor(a.name);
            const on = followed.has(a.id);
            return (
              <li key={a.id}>
                <button type="button" className="tile h-full w-full" aria-pressed={on} onClick={() => toggle(a.id)}>
                  <span className="check" aria-hidden="true">✓</span>
                  {artistImage(a.name) ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={artistImage(a.name)!.url} alt="" loading="lazy" referrerPolicy="no-referrer" className="aspect-square w-full rounded-xl object-cover" />
                  ) : (
                    <span className="monogram" style={{ background: bg, color: fg }} aria-hidden="true">{initials(a.name)}</span>
                  )}
                  <span className="mt-2 block">
                    <span className="block text-sm font-bold leading-tight">{a.name}</span>
                    <span className="block text-[11px] muted">
                      {a.genres.slice(0, 2).map((g) => genres.find((x) => x.slug === g)?.name ?? g).join(" · ")}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
