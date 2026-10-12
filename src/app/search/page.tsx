import Link from "next/link";
import { Suspense } from "react";
import { ArtistAvatar } from "@/components/ArtistAvatar";
import { EventRow } from "@/components/EventRow";
import { TrackArtist } from "@/components/TrackArtist";
import { requireUser } from "@/lib/auth";
import { loadFeedEvents, loadPrefs } from "@/lib/data";
import { ALL_INDIA_CITIES } from "@/lib/catalog/cities";
import { normalizeName } from "@/lib/discovery/normalize";
import { buildFeed } from "@/lib/feed";
import { createClient } from "@/lib/supabase/server";

type SP = Promise<{ q?: string }>;

export default function SearchPage({ searchParams }: { searchParams: SP }) {
  return (
    <Suspense fallback={<p className="muted" role="status">Searching…</p>}>
      <Results searchParams={searchParams} />
    </Suspense>
  );
}

// Words people type around a search ("Sunidhi Chauhan concert next week in Hyderabad") that never appear in a show record.
const FILLER = new Set(["concert", "concerts", "show", "shows", "live", "tour", "tickets", "ticket", "next", "this", "week", "weekend", "today", "tomorrow", "in", "at", "the", "of", "on", "for", "near", "me", "india", "event", "events", "gig", "gigs"]);

async function Results({ searchParams }: { searchParams: SP }) {
  const raw = ((await searchParams).q ?? "").trim().slice(0, 100);
  const user = await requireUser();
  const sb = await createClient();
  const [events, { prefs }] = await Promise.all([loadFeedEvents(sb), loadPrefs(sb, user.id)]);
  const words = raw.split(/\s+/).filter((w) => w && !FILLER.has(w.toLowerCase()));
  const q = words.join(" ");

  const upcoming = q ? buildFeed(events, prefs, { scope: "all", when: "upcoming", q, sort: "date" }).filter((i) => !i.event.is_sample) : [];
  const past = q ? buildFeed(events, prefs, { scope: "all", when: "past", q, sort: "date" }).filter((i) => !i.event.is_sample).slice(0, 8) : [];

  // an artist matches when every word of their name is in the search, or the search is part of their name
  const { data: artistRows } = q ? await sb.from("artists").select("id, name").order("name") : { data: [] as { id: string; name: string }[] };
  const typed = new Set(normalizeName(q).split(" ").filter(Boolean));
  const artists = (artistRows ?? [])
    .filter((a) => {
      const n = normalizeName(a.name);
      return n.includes(normalizeName(q)) || n.split(" ").every((w) => typed.has(w));
    })
    .slice(0, 8);
  const cityWords = new Set(ALL_INDIA_CITIES.flatMap((c) => c.toLowerCase().split(" ")));
  const nameGuess = words.filter((w) => !cityWords.has(w.toLowerCase())).join(" ");
  const favIds = new Set(prefs.followedArtistIds);

  return (
    <>
      <h1>{raw ? <>Results for &ldquo;{raw}&rdquo;</> : "Search"}</h1>
      <form action="/search" method="get" role="search" className="mt-3 flex max-w-xl gap-2">
        <label htmlFor="search-q" className="sr-only">Search artists, cities and venues</label>
        <input id="search-q" name="q" defaultValue={raw} placeholder="e.g. Shreya Ghoshal, or Hyderabad, or a venue" className="field" autoFocus />
        <button type="submit" className="btn-primary">Search</button>
      </form>

      {!raw && <p className="mt-4 text-sm muted">Search any artist, city or venue. You can type it the way you would say it, for example &ldquo;Sunidhi Chauhan concert in Hyderabad&rdquo;.</p>}

      {raw && (
        <div className="mt-5 space-y-6">
          {artists.length > 0 && (
            <section aria-labelledby="sa">
              <h2 id="sa" className="mono !text-xs">Artists</h2>
              <ul className="mt-2 flex flex-wrap gap-2">
                {artists.map((a) => (
                  <li key={a.id} className="flex items-center gap-2 rounded-full border border-line py-1 pl-1 pr-3 text-sm">
                    <ArtistAvatar name={a.name} size={28} />
                    {a.name}
                    {favIds.has(a.id) && <span className="badge-lime">Favourite</span>}
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-xs muted">Add artists to your favourites on the <Link href="/artists" className="underline underline-offset-2">Artists</Link> page.</p>
            </section>
          )}

          <section aria-labelledby="su">
            <h2 id="su" className="mono !text-xs">Upcoming shows ({upcoming.length})</h2>
            {upcoming.length > 0 ? (
              <ul>{upcoming.map((i) => <EventRow key={i.event.id} item={i} favourite={i.event.artists.some((a) => favIds.has(a.id))} />)}</ul>
            ) : (
              <p className="mt-2 text-sm muted">
                No upcoming show found for &ldquo;{q || raw}&rdquo;.
                {artists.length > 0 ? " We do track them: no India date has been announced yet, and we will alert you if you add them to your favourites." : " We have not seen any announced show matching this."}
              </p>
            )}
          </section>

          {past.length > 0 && (
            <section aria-labelledby="sp">
              <h2 id="sp" className="mono !text-xs">Past shows</h2>
              <ul>{past.map((i) => <EventRow key={i.event.id} item={i} />)}</ul>
            </section>
          )}

          {nameGuess.length >= 2 && artists.length === 0 && (
            <section className="card !p-4" aria-label="Track this artist">
              <p className="text-sm font-semibold">Looking for an artist we do not have?</p>
              <p className="text-xs muted">Add them and we will watch for their India shows and alert you. Nothing is shown as a show until a source reports it.</p>
              <TrackArtist name={nameGuess} />
            </section>
          )}
        </div>
      )}
    </>
  );
}
