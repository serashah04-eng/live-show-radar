"use client";

import { useMemo, useState, useTransition } from "react";
import { setFollow, setFollowMany } from "@/app/artists/actions";

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
  const [origin, setOrigin] = useState<string | null>(null);
  const [onlyMine, setOnlyMine] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const genreCounts = useMemo(() => {
    const m = new Map<string, number>();
    for (const a of artists) for (const g of a.genres) m.set(g, (m.get(g) ?? 0) + 1);
    return m;
  }, [artists]);

  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const mine = new Set(myGenres);
    return artists.filter(
      (a) =>
        (!needle || a.name.toLowerCase().includes(needle)) &&
        (!genre || a.genres.includes(genre)) &&
        (!origin || a.origin === origin) &&
        (!onlyMine || a.genres.some((g) => mine.has(g))),
    );
  }, [artists, q, genre, origin, onlyMine, myGenres]);

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

  const bulk = (follow: boolean) => {
    const ids = shown.map((a) => a.id);
    setError(null);
    apply(ids, follow);
    if (mode === "live")
      startTransition(async () => {
        const r = await setFollowMany(ids, follow);
        if (!r.ok) {
          apply(ids, !follow);
          setError("That didn't save. Check your connection and try again.");
        }
      });
  };

  return (
    <div>
      {mode === "draft" && [...followed].map((id) => <input key={id} type="hidden" name="artists" value={id} />)}

      <div className="flex flex-wrap items-center gap-2">
        <label htmlFor="artist-search" className="sr-only">Filter artists by name</label>
        <input id="artist-search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Filter by name (optional)" className="field max-w-xs" />
        <button type="button" className="btn-ghost min-h-9 px-4" onClick={() => bulk(true)} disabled={shown.length === 0}>Select all shown</button>
        <button type="button" className="btn-ghost min-h-9 px-4" onClick={() => bulk(false)} disabled={shown.length === 0}>Clear shown</button>
      </div>

      <div className="mt-3 flex gap-2 overflow-x-auto pb-2" role="group" aria-label="Filter by type">
        <button type="button" className="pill-tab" aria-pressed={origin === null} onClick={() => setOrigin(null)}>All types</button>
        {ORIGINS.map((o) => (
          <button key={o.key} type="button" className="pill-tab" aria-pressed={origin === o.key} onClick={() => setOrigin(origin === o.key ? null : o.key)}>
            {o.label}
          </button>
        ))}
      </div>
      <div className="flex gap-2 overflow-x-auto pb-2" role="group" aria-label="Filter by genre">
        {myGenres.length > 0 && (
          <button type="button" className="pill-tab" aria-pressed={onlyMine} onClick={() => setOnlyMine(!onlyMine)}>My genres</button>
        )}
        <button type="button" className="pill-tab" aria-pressed={genre === null} onClick={() => setGenre(null)}>Every genre</button>
        {genres.filter((g) => genreCounts.has(g.slug)).map((g) => (
          <button key={g.slug} type="button" className="pill-tab" aria-pressed={genre === g.slug} onClick={() => setGenre(genre === g.slug ? null : g.slug)}>
            {g.name} <span className="ml-1 opacity-60">{genreCounts.get(g.slug)}</span>
          </button>
        ))}
      </div>

      <p className="mono mt-3" aria-live="polite">
        Following {followed.size} · showing {shown.length} of {artists.length}
      </p>
      {error && <p className="notice-err mt-2" role="alert">{error}</p>}

      {shown.length === 0 ? (
        <p className="card mt-3 muted">No artists match these filters. Clear a filter above, or add the artist below.</p>
      ) : (
        <ul className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
          {shown.map((a) => {
            const [bg, fg] = colorFor(a.name);
            const on = followed.has(a.id);
            return (
              <li key={a.id}>
                <button type="button" className="tile h-full w-full" aria-pressed={on} onClick={() => toggle(a.id)}>
                  <span className="check" aria-hidden="true">✓</span>
                  <span className="monogram" style={{ background: bg, color: fg }} aria-hidden="true">{initials(a.name)}</span>
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
