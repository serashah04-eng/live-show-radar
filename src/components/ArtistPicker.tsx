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

const COLORS = [["#315cff", "#ffffff"], ["#ff7a30", "#151821"], ["#c6d800", "#151821"], ["#2f3649", "#f4f5f7"]];
const colorFor = (name: string) => {
  let h = 0;
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return COLORS[h % COLORS.length];
};
const initials = (name: string) =>
  name.replace(/[^A-Za-z0-9 ]/g, "").split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase() || "?";

function Photo({ name, size }: { name: string; size: number }) {
  const img = artistImage(name)?.url;
  const [bg, fg] = colorFor(name);
  const box = { width: size, height: size } as const;
  if (img) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={img} alt="" width={size} height={size} loading="lazy" referrerPolicy="no-referrer" className="rounded-full object-cover" style={box} />;
  }
  return <span aria-hidden="true" className="grid place-items-center rounded-full font-bold" style={{ ...box, background: bg, color: fg, fontSize: size / 3 }}>{initials(name)}</span>;
}

/**
 * Genre first, then artist: pick a genre to see only its artists, or search to pull in an artist from any other genre.
 * `live` saves each tap straight away; `draft` only collects hidden form fields (used inside onboarding).
 */
export function ArtistPicker({
  artists,
  genres,
  initialFollowed,
  mode,
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
  const [moreGenres, setMoreGenres] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const genreName = useMemo(() => new Map(genres.map((g) => [g.slug, g.name])), [genres]);
  const byId = useMemo(() => new Map(artists.map((a) => [a.id, a])), [artists]);
  const counts = useMemo(() => {
    const m = new Map<string, number>();
    for (const a of artists) for (const g of a.genres) m.set(g, (m.get(g) ?? 0) + 1);
    return m;
  }, [artists]);
  const ranked = useMemo(() => genres.filter((g) => counts.has(g.slug)).sort((x, y) => (counts.get(y.slug) ?? 0) - (counts.get(x.slug) ?? 0)), [genres, counts]);
  const visibleGenres = moreGenres ? ranked : ranked.slice(0, 10);

  const needle = q.trim().toLowerCase();
  const shown = useMemo(() => {
    if (needle) return artists.filter((a) => a.name.toLowerCase().includes(needle));
    if (genre) return artists.filter((a) => a.genres.includes(genre));
    return [];
  }, [artists, needle, genre]);

  const apply = (id: string, follow: boolean) =>
    setFollowed((prev) => {
      const next = new Set(prev);
      if (follow) next.add(id);
      else next.delete(id);
      return next;
    });

  const toggle = (id: string) => {
    const follow = !followed.has(id);
    setError(null);
    apply(id, follow);
    if (mode === "live")
      startTransition(async () => {
        const r = await setFollow(id, follow);
        if (!r.ok) {
          apply(id, !follow);
          setError("That didn't save. Check your connection and try again.");
        }
      });
  };

  const chosen = [...followed].map((id) => byId.get(id)).filter((a): a is PickerArtist => Boolean(a));

  return (
    <div>
      {mode === "draft" && [...followed].map((id) => <input key={id} type="hidden" name="artists" value={id} />)}

      {/* 1. genre */}
      <p className="mono mb-2">1 · Pick a genre</p>
      <div className="flex flex-wrap gap-1.5" role="group" aria-label="Genres">
        {visibleGenres.map((g) => (
          <button key={g.slug} type="button" className="pill-tab" aria-pressed={genre === g.slug && !needle} onClick={() => { setQ(""); setGenre(genre === g.slug ? null : g.slug); }}>
            {g.name} <span className="ml-1 opacity-60">{counts.get(g.slug)}</span>
          </button>
        ))}
        {ranked.length > 10 && (
          <button type="button" className="pill-tab" onClick={() => setMoreGenres(!moreGenres)}>{moreGenres ? "Fewer genres" : `+${ranked.length - 10} more genres`}</button>
        )}
      </div>

      {/* 2. artists of that genre, or search results from any genre */}
      <div className="mt-5 flex flex-wrap items-center justify-between gap-2">
        <p className="mono">2 · {needle ? `Search results (${shown.length})` : genre ? `${genreName.get(genre)} artists (${shown.length})` : "Pick the artists you follow"}</p>
        <div>
          <label htmlFor="artist-search" className="sr-only">Search any artist</label>
          <input id="artist-search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search any artist, any genre" className="field w-64 max-w-full" />
        </div>
      </div>
      {error && <p className="notice-err mt-2" role="alert">{error}</p>}

      {shown.length === 0 ? (
        <p className="card mt-3 text-sm muted">
          {needle ? <>No artist called &ldquo;{q}&rdquo; in the list. You can add them from the Artists page.</> : <>Choose a genre above to see its artists, or search for one by name.</>}
        </p>
      ) : (
        <ul className="mt-3 grid grid-cols-3 gap-x-3 gap-y-5 sm:grid-cols-5 lg:grid-cols-7">
          {shown.map((a) => {
            const on = followed.has(a.id);
            return (
              <li key={a.id}>
                <button type="button" aria-pressed={on} onClick={() => toggle(a.id)} className="group flex w-full flex-col items-center text-center" title={on ? `Unfollow ${a.name}` : `Follow ${a.name}`}>
                  <span className={`relative rounded-full p-[3px] transition ${on ? "bg-lime" : "bg-transparent group-hover:bg-line"}`}>
                    <Photo name={a.name} size={92} />
                    {on && <span className="absolute -right-0.5 -top-0.5 grid size-5 place-items-center rounded-full bg-lime text-[11px] font-extrabold text-charcoal" aria-hidden="true">✓</span>}
                  </span>
                  <span className="mt-2 line-clamp-2 text-xs font-semibold leading-tight">{a.name}</span>
                  <span className="mt-1 flex flex-wrap justify-center gap-1">
                    {a.genres.slice(0, 2).map((g) => <span key={g} className="rounded-full border border-line px-1.5 py-px text-[10px] muted">{genreName.get(g) ?? g}</span>)}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {/* what you follow, from every genre */}
      <div className="mt-6 border-t border-line pt-4">
        <p className="mono mb-2">Following {chosen.length}</p>
        {chosen.length === 0 ? (
          <p className="text-sm muted">Nobody yet.</p>
        ) : (
          <ul className="flex flex-wrap gap-1.5">
            {chosen.map((a) => (
              <li key={a.id}>
                <button type="button" className="flex items-center gap-1.5 rounded-full border border-line py-0.5 pl-0.5 pr-2.5 text-xs hover:border-orange" onClick={() => toggle(a.id)} aria-label={`Unfollow ${a.name}`}>
                  <Photo name={a.name} size={22} />
                  {a.name} <span aria-hidden="true" className="muted">✕</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
