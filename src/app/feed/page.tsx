import Link from "next/link";
import { Suspense } from "react";
import { EventCard } from "@/components/EventCard";
import { requireUser } from "@/lib/auth";
import { loadFeedEvents, loadGenres, loadPrefs } from "@/lib/data";
import { buildFeed, emptyStateHints, type Filters } from "@/lib/feed";
import { INDIAN_CITIES } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

type SP = Promise<Record<string, string | string[] | undefined>>;

export default function FeedPage({ searchParams }: { searchParams: SP }) {
  return (
    <>
      <h1 className="text-4xl sm:text-5xl">Concert feed</h1>
      <Suspense fallback={<p className="mt-6 muted" role="status">Loading concerts…</p>}>
        <Feed searchParams={searchParams} />
      </Suspense>
    </>
  );
}

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) || undefined;
const STATUSES = ["all", "verified", "corroborated", "pending"] as const;
const SORTS = ["relevance", "date", "discovered", "deadline"] as const;

async function Feed({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const user = await requireUser();
  const sb = await createClient();
  const [events, { prefs }, genres, { data: artists }] = await Promise.all([
    loadFeedEvents(sb),
    loadPrefs(sb, user.id),
    loadGenres(sb),
    sb.from("artists").select("id, name").order("name"),
  ]);

  const status = one(sp.status);
  const sort = one(sp.sort);
  const filters: Filters = {
    artistId: one(sp.artist),
    genre: one(sp.genre),
    city: one(sp.city),
    from: one(sp.from),
    to: one(sp.to),
    ticketStatus: one(sp.ticket),
    status: (STATUSES as readonly string[]).includes(status ?? "") ? (status as Filters["status"]) : "all",
    sort: (SORTS as readonly string[]).includes(sort ?? "") ? (sort as Filters["sort"]) : "relevance",
  };
  const items = buildFeed(events, prefs, filters);
  const baseline = buildFeed(events, prefs, { sort: filters.sort });
  const filtersActive = Boolean(filters.artistId || filters.genre || filters.city || filters.from || filters.to || filters.ticketStatus || filters.status !== "all");
  const cityOptions = [...new Set([...INDIAN_CITIES, ...events.map((e) => e.city).filter((c): c is string => Boolean(c))])].sort();

  return (
    <div className="mt-6 grid gap-6 lg:grid-cols-[17rem_1fr]">
      <form method="get" className="card h-fit space-y-4" aria-label="Feed filters">
        <p className="text-xs muted">
          Filters are temporary. Your saved preferences (genres, followed artists, cities) are in{" "}
          <Link className="text-cobalt-soft underline" href="/settings">Settings</Link>.
        </p>
        <div>
          <label className="label" htmlFor="artist">Artist</label>
          <select id="artist" name="artist" defaultValue={filters.artistId ?? ""} className="field">
            <option value="">Any artist</option>
            {(artists ?? []).map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="genre">Genre</label>
          <select id="genre" name="genre" defaultValue={filters.genre ?? ""} className="field">
            <option value="">Any genre</option>
            {genres.map((g) => <option key={g.id} value={g.slug}>{g.name}</option>)}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="city">City</label>
          <select id="city" name="city" defaultValue={filters.city ?? ""} className="field">
            <option value="">Any city</option>
            {cityOptions.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="label" htmlFor="from">From</label>
            <input id="from" name="from" type="date" defaultValue={filters.from ?? ""} className="field" />
          </div>
          <div>
            <label className="label" htmlFor="to">To</label>
            <input id="to" name="to" type="date" defaultValue={filters.to ?? ""} className="field" />
          </div>
        </div>
        <div>
          <label className="label" htmlFor="status">Verification</label>
          <select id="status" name="status" defaultValue={filters.status} className="field">
            <option value="all">All</option>
            <option value="verified">Verified only</option>
            <option value="corroborated">Reported by 2+ sites</option>
            <option value="pending">Unconfirmed</option>
          </select>
        </div>
        <div>
          <label className="label" htmlFor="ticket">Ticket status</label>
          <select id="ticket" name="ticket" defaultValue={filters.ticketStatus ?? ""} className="field">
            <option value="">Any</option>
            <option value="tickets_available">Tickets listed</option>
            <option value="early_bird_announced">Early bird announced</option>
            <option value="early_bird_ending_soon">Early bird ending soon</option>
            <option value="sold_out">Sold out</option>
            <option value="unknown">Unknown</option>
          </select>
        </div>
        <div>
          <label className="label" htmlFor="sort">Sort by</label>
          <select id="sort" name="sort" defaultValue={filters.sort} className="field">
            <option value="relevance">Relevance (your cities first)</option>
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
        <p className="mb-3 text-sm muted">
          Showing <strong className="text-offwhite">{items.length}</strong>
          {filtersActive && <> of {baseline.length} that match your saved preferences</>}
          {" "}· {events.length} concerts stored in total
        </p>
        {items.length === 0 ? (
          <div className="card">
            <h2 className="text-2xl">No concerts match</h2>
            <p className="mt-2 muted">
              {events.length === 0
                ? "No concerts have been discovered yet. Nothing is shown rather than inventing events."
                : "Nothing matches the current preferences and filters. We never fabricate events to fill the feed. You could:"}
            </p>
            <ul className="mt-3 list-disc space-y-1 pl-5 text-sm">
              {emptyStateHints(prefs, filters).map((h) => <li key={h}>{h}</li>)}
            </ul>
          </div>
        ) : (
          <div className="space-y-3">{items.map((i) => <EventCard key={i.event.id} item={i} />)}</div>
        )}
      </section>
    </div>
  );
}
