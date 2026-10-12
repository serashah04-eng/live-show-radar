"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { setFollowMany } from "@/app/artists/actions";
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
 * Genre first, then artist. Pick any number of genres (or search any artist), tap photos to SELECT, then press
 * "Add to favourites" to save them. In `draft` mode (onboarding) the selection is simply sent with the form.
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
  const [saved, setSaved] = useState<Set<string>>(new Set(initialFollowed)); // already in favourites
  const [staged, setStaged] = useState<Set<string>>(new Set()); // selected, not yet added (live mode)
  const [draft, setDraft] = useState<Set<string>>(new Set(initialFollowed)); // onboarding selection
  const [q, setQ] = useState("");
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [moreGenres, setMoreGenres] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const live = mode === "live";
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
    if (picked.size) return artists.filter((a) => a.genres.some((g) => picked.has(g)));
    return [];
  }, [artists, needle, picked]);

  const toggleGenre = (slug: string) =>
    setPicked((p) => {
      const n = new Set(p);
      if (n.has(slug)) n.delete(slug);
      else n.add(slug);
      return n;
    });

  // the set that tiles toggle: staged picks (live) or the onboarding selection (draft)
  const selection = live ? staged : draft;
  const setSelection = live ? setStaged : setDraft;
  const isSaved = (id: string) => live && saved.has(id);
  const isOn = (id: string) => isSaved(id) || selection.has(id);

  const toggle = (id: string) => {
    if (isSaved(id)) return; // already in favourites: remove it from the Favourites page
    setDone(null);
    setError(null);
    setSelection((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectable = shown.filter((a) => !isSaved(a.id));
  const allChosen = selectable.length > 0 && selectable.every((a) => selection.has(a.id));
  const chooseAll = () =>
    setSelection((prev) => {
      const next = new Set(prev);
      for (const a of selectable) {
        if (allChosen) next.delete(a.id);
        else next.add(a.id);
      }
      return next;
    });

  const addToFavourites = () => {
    const ids = [...staged];
    if (ids.length === 0) return;
    setError(null);
    startTransition(async () => {
      const r = await setFollowMany(ids, true);
      if (!r.ok) {
        setError("That didn't save. Check your connection and try again.");
        return;
      }
      setSaved((prev) => new Set([...prev, ...ids]));
      setStaged(new Set());
      setDone(`${ids.length} artist${ids.length === 1 ? "" : "s"} added to your favourites.`);
    });
  };

  const chosen = [...selection].map((id) => byId.get(id)).filter((a): a is PickerArtist => Boolean(a));

  return (
    <div>
      {!live && [...draft].map((id) => <input key={id} type="hidden" name="artists" value={id} />)}

      {/* 1. genres */}
      <p className="mono mb-2">1 · Pick genres (as many as you like)</p>
      <div className="flex flex-wrap gap-1.5" role="group" aria-label="Genres">
        {visibleGenres.map((g) => (
          <button key={g.slug} type="button" className="pill-tab" aria-pressed={picked.has(g.slug)} onClick={() => { setQ(""); toggleGenre(g.slug); }}>
            {g.name} <span className="ml-1 opacity-60">{counts.get(g.slug)}</span>
          </button>
        ))}
        {picked.size > 0 && <button type="button" className="pill-tab" onClick={() => setPicked(new Set())}>Clear genres ({picked.size})</button>}
        {ranked.length > 10 && (
          <button type="button" className="pill-tab" onClick={() => setMoreGenres(!moreGenres)}>{moreGenres ? "Fewer genres" : `+${ranked.length - 10} more genres`}</button>
        )}
      </div>

      {/* 2. artists */}
      <div className="mt-5 flex flex-wrap items-center justify-between gap-2">
        <p className="mono">2 · {needle ? `Search results (${shown.length})` : picked.size ? `${[...picked].map((g) => genreName.get(g) ?? g).join(" + ")}: ${shown.length} artists` : "Select artists"}</p>
        <div className="flex flex-wrap items-center gap-2">
          {selectable.length > 0 && (
            <button type="button" className="btn-ghost !min-h-8 !px-3 text-xs" onClick={chooseAll}>
              {allChosen ? `Unselect these ${selectable.length}` : `Choose all ${selectable.length} shown`}
            </button>
          )}
          {selection.size > 0 && (
            <button type="button" className="btn-ghost !min-h-8 !px-3 text-xs" onClick={() => setSelection(new Set())}>Clear selection ({selection.size})</button>
          )}
          <label htmlFor="artist-search" className="sr-only">Search any artist</label>
          <input id="artist-search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search any artist, any genre" className="field w-64 max-w-full" />
        </div>
      </div>
      {error && <p className="notice-err mt-2" role="alert">{error}</p>}
      {done && (
        <p className="notice-ok mt-2" role="status">
          {done} <Link href="/favourites" className="underline underline-offset-2">View favourites</Link>
        </p>
      )}

      {shown.length === 0 ? (
        <p className="card mt-3 text-sm muted">
          {needle ? <>No artist called &ldquo;{q}&rdquo; in the list. You can add them with the form below.</> : <>Choose one or more genres above to see their artists, or search for one by name.</>}
        </p>
      ) : (
        <ul className="mt-3 grid grid-cols-3 gap-x-3 gap-y-5 sm:grid-cols-5 lg:grid-cols-7">
          {shown.map((a) => {
            const on = isOn(a.id);
            const inFav = isSaved(a.id);
            return (
              <li key={a.id}>
                <button type="button" aria-pressed={on} onClick={() => toggle(a.id)} className="group flex w-full flex-col items-center text-center" title={inFav ? `${a.name} is in your favourites` : on ? `Unselect ${a.name}` : `Select ${a.name}`}>
                  <span className={`relative rounded-full p-[3px] transition ${on ? (inFav ? "bg-cobalt" : "bg-lime") : "bg-transparent group-hover:bg-line"}`}>
                    <Photo name={a.name} size={92} />
                    {on && <span className={`absolute -right-0.5 -top-0.5 grid size-5 place-items-center rounded-full text-[11px] font-extrabold ${inFav ? "bg-cobalt text-white" : "bg-lime text-ink"}`} aria-hidden="true">✓</span>}
                  </span>
                  <span className="mt-2 line-clamp-2 text-xs font-semibold leading-tight">{a.name}</span>
                  {inFav ? (
                    <span className="mt-1 text-[10px] text-cobalt-soft">In favourites</span>
                  ) : (
                    <span className="mt-1 flex flex-wrap justify-center gap-1">
                      {a.genres.slice(0, 2).map((g) => <span key={g} className="rounded-full border border-line px-1.5 py-px text-[10px] muted">{genreName.get(g) ?? g}</span>)}
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {/* what is selected */}
      <div className="mt-6 border-t border-line pt-4">
        <p className="mono mb-2">{live ? `Selected to add (${chosen.length})` : `Following ${chosen.length}`}</p>
        {chosen.length === 0 ? (
          <p className="text-sm muted">{live ? `Nothing selected. ${saved.size} artist${saved.size === 1 ? " is" : "s are"} already in your favourites.` : "Nobody yet."}</p>
        ) : (
          <ul className="flex flex-wrap gap-1.5">
            {chosen.map((a) => (
              <li key={a.id}>
                <button type="button" className="flex items-center gap-1.5 rounded-full border border-line py-0.5 pl-0.5 pr-2.5 text-xs hover:border-orange" onClick={() => toggle(a.id)} aria-label={`Unselect ${a.name}`}>
                  <Photo name={a.name} size={22} />
                  {a.name} <span aria-hidden="true" className="muted">✕</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {live && staged.size > 0 && (
        <div className="sticky bottom-0 -mx-4 mt-4 flex flex-wrap items-center gap-3 border-t border-line bg-charcoal/95 px-4 py-3 backdrop-blur">
          <button type="button" className="btn-primary" onClick={addToFavourites} disabled={pending}>
            {pending ? "Adding…" : `Add ${staged.size} to favourites`}
          </button>
          <span className="text-sm muted">Saved artists are used for your results and alerts.</span>
        </div>
      )}
    </div>
  );
}
