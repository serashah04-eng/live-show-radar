import Link from "next/link";
import { Suspense } from "react";
import { EventCard } from "@/components/EventCard";
import { FindShows } from "@/components/FindShows";
import { requireUser } from "@/lib/auth";
import { loadFeedEvents, loadGenres, loadPendingSearches, loadPrefs } from "@/lib/data";
import { buildFacets, buildFeed, defaultScope, emptyStateHints, placeholderItem, type FacetOption, type Filters } from "@/lib/feed";
import { createClient } from "@/lib/supabase/server";

// "Find shows" runs a search per artist from this page; allow it the hosting maximum.
export const maxDuration = 300;

type SP = Promise<Record<string, string | string[] | undefined>>;

export default function FeedPage({ searchParams }: { searchParams: SP }) {
  return (
    <>
      <p className="mono">Concert feed</p>
      <h1 className="text-4xl sm:text-6xl">Every show, filtered</h1>
      <Suspense fallback={<p className="mt-6 muted" role="status">Loading concerts…</p>}>
        <Feed searchParams={searchParams} />
      </Suspense>
    </>
  );
}

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) || undefined;
const STATUSES = ["all", "verified", "corroborated", "pending"] as const;
const SORTS = ["relevance", "date", "discovered", "deadline"] as const;

function Select({ id, label, value, options, anyLabel }: { id: string; label: string; value?: string; options: FacetOption[]; anyLabel: string }) {
  return (
    <div>
      <label className="label" htmlFor={id}>{label}</label>
      <select id={id} name={id} defaultValue={value ?? ""} className="field">
        <option value="">{anyLabel}</option>
        {options.map((o) => <option key={o.value} value={o.value}>{o.label} ({o.count})</option>)}
      </select>
    </div>
  );
}

async function Feed({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const user = await requireUser();
  const sb = await createClient();
  const [events, { prefs }, genres] = await Promise.all([loadFeedEvents(sb), loadPrefs(sb, user.id), loadGenres(sb)]);

  const status = one(sp.status);
  const sort = one(sp.sort);
  const when = one(sp.when) === "past" ? "past" : "upcoming";
  const filters: Filters = {
    artistId: one(sp.artist),
    genre: one(sp.genre),
    city: one(sp.city),
    venue: one(sp.venue),
    month: one(sp.month),
    type: one(sp.type),
    q: one(sp.q),
    bookable: one(sp.bookable) === "1",
    from: one(sp.from),
    to: one(sp.to),
    ticketStatus: one(sp.ticket),
    status: (STATUSES as readonly string[]).includes(status ?? "") ? (status as Filters["status"]) : "all",
    sort: (SORTS as readonly string[]).includes(sort ?? "") ? (sort as Filters["sort"]) : "relevance",
    scope: (["mine", "genres", "all"] as const).find((s) => s === one(sp.scope)),
    when,
  };
  const effectiveScope = filters.scope ?? (when === "past" ? "all" : defaultScope(prefs));

  // Facets come from the shows in view (scope + when only), so every option has at least one real show.
  const baseline = buildFeed(events, prefs, { scope: filters.scope, when, sort: filters.sort });
  const genreNames = new Map(genres.map((g) => [g.slug, g.name]));
  const facets = buildFacets(baseline, genreNames);

  const real = buildFeed(events, prefs, filters);
  const allArtists = [...new Map(events.flatMap((e) => e.artists).map((a) => [a.id, a])).values()];
  const filtersActive = Boolean(
    filters.artistId || filters.genre || filters.city || filters.venue || filters.month || filters.type || filters.q || filters.bookable ||
      filters.from || filters.to || filters.ticketStatus || filters.status !== "all" || filters.scope || when === "past",
  );
  // never a blank list: if nothing real matches, show one clearly labelled placeholder
  const showPlaceholder = real.length === 0;
  const items = showPlaceholder ? [placeholderItem(filters, { artists: allArtists, prefs, now: new Date() })] : real;
  const pending = await loadPendingSearches(sb, prefs.followedArtistIds);

  return (
    <div className="mt-6 grid gap-6 lg:grid-cols-[18rem_1fr]">
      <form method="get" className="card h-fit space-y-4" aria-label="Feed filters">
        <p className="text-xs muted">
          Filters are temporary. Your saved picks are in <Link className="text-lime underline" href="/settings">Settings</Link>. Every option below has at least one real show, with the count in brackets.
        </p>

        <fieldset>
          <legend className="label">When</legend>
          {([["upcoming", "Upcoming"], ["past", "Past shows (history)"]] as const).map(([v, l]) => (
            <label key={v} className="flex cursor-pointer items-center gap-3 py-1 text-sm">
              <input type="radio" name="when" value={v} defaultChecked={when === v} className="size-4 accent-[#c4d600]" />
              {l}
            </label>
          ))}
        </fieldset>

        <fieldset>
          <legend className="label">Show me</legend>
          {([
            ["mine", "Favourites", "Only your followed favourites"],
            ["genres", "+ my genres", "Followed artists and saved genres"],
            ["all", "Everything", "Discover artists you don't follow"],
          ] as const).map(([value, label, hint]) => (
            <label key={value} className="flex cursor-pointer items-start gap-3 py-1">
              <input type="radio" name="scope" value={value} defaultChecked={effectiveScope === value} className="mt-1 size-4 accent-[#c4d600]" />
              <span><span className="block text-sm font-bold">{label}</span><span className="block text-xs muted">{hint}</span></span>
            </label>
          ))}
        </fieldset>

        <div>
          <label className="label" htmlFor="q">Search</label>
          <input id="q" name="q" defaultValue={filters.q ?? ""} placeholder="Artist, venue, city…" className="field" />
        </div>
        <Select id="artist" label="Artist" value={filters.artistId} options={facets.artists} anyLabel="Any artist" />
        <Select id="venue" label="Venue" value={filters.venue} options={facets.venues} anyLabel="Any venue" />
        <Select id="type" label="Event type" value={filters.type} options={facets.types} anyLabel="Any type" />
        <Select id="month" label="Month" value={filters.month} options={facets.months} anyLabel="Any month" />
        <Select id="city" label="City" value={filters.city} options={facets.cities} anyLabel="Any city" />
        <Select id="genre" label="Genre" value={filters.genre} options={facets.genres} anyLabel="Any genre" />
        <Select id="ticket" label="Ticket status" value={filters.ticketStatus} options={facets.ticketStatuses} anyLabel="Any status" />

        <div>
          <label className="label" htmlFor="status">Verification</label>
          <select id="status" name="status" defaultValue={filters.status} className="field">
            <option value="all">All</option>
            <option value="verified">Verified only</option>
            <option value="corroborated">Reported by 2+ sites</option>
            <option value="pending">Unconfirmed</option>
          </select>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div><label className="label" htmlFor="from">From</label><input id="from" name="from" type="date" defaultValue={filters.from ?? ""} className="field" /></div>
          <div><label className="label" htmlFor="to">To</label><input id="to" name="to" type="date" defaultValue={filters.to ?? ""} className="field" /></div>
        </div>
        <label className="flex cursor-pointer items-center gap-3 text-sm">
          <input type="checkbox" name="bookable" value="1" defaultChecked={filters.bookable} className="size-5 accent-[#c4d600]" />
          Only shows with a booking link
        </label>
        <div>
          <label className="label" htmlFor="sort">Sort by</label>
          <select id="sort" name="sort" defaultValue={filters.sort} className="field">
            <option value="relevance">{when === "past" ? "Newest first" : "Relevance (your #1 city first)"}</option>
            <option value="date">Event date</option>
            <option value="discovered">Newly discovered</option>
            <option value="deadline">Verified deadline</option>
          </select>
        </div>
        <div className="flex gap-2">
          <button className="btn-primary flex-1" type="submit">Apply</button>
          <Link href="/feed" className="btn-ghost flex-1">Reset filters</Link>
        </div>
      </form>

      <section aria-live="polite">
        <div className="mb-4"><FindShows pending={pending} followedCount={prefs.followedArtistIds.length} /></div>
        <p className="mb-3 text-sm muted">
          {showPlaceholder ? (
            <>No real show matches these filters, so a labelled sample is shown below.</>
          ) : (
            <>
              Showing <strong className="text-offwhite">{real.length}</strong>
              {filtersActive && <> of {baseline.length} in this view</>} · {events.length} shows stored in total
            </>
          )}
        </p>
        {showPlaceholder && (
          <div className="card mb-3">
            <p className="font-bold">Nothing real matches yet.</p>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm muted">{emptyStateHints(prefs, filters).slice(0, 4).map((h) => <li key={h}>{h}</li>)}</ul>
          </div>
        )}
        <div className="space-y-3">{items.map((i) => <EventCard key={i.event.id} item={i} />)}</div>
      </section>
    </div>
  );
}
