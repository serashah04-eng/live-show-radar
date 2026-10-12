import Link from "next/link";
import { Suspense } from "react";
import { EventRow } from "@/components/EventRow";
import { requireUser } from "@/lib/auth";
import { loadFeedEvents, loadGenres, loadPrefs } from "@/lib/data";
import { buildFacets, buildFeed, type FacetOption, type FeedItem, type Filters } from "@/lib/feed";
import { createClient } from "@/lib/supabase/server";

type SP = Promise<Record<string, string | string[] | undefined>>;

export default function FeedPage({ searchParams }: { searchParams: SP }) {
  return (
    <Suspense fallback={<p className="muted" role="status">Loading the calendar…</p>}>
      <Feed searchParams={searchParams} />
    </Suspense>
  );
}

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) || undefined;
const DAY = 86400000;
const iso = (d: Date) => d.toISOString().slice(0, 10);
/** YYYY-MM-DD of a show in India time (a show is on the day it happens in India, whatever the UTC clock says). */
const istDay = (starts: string) => new Date(starts).toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
const mondayOf = (d: Date) => {
  const x = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const wd = (x.getUTCDay() + 6) % 7; // Monday = 0
  return new Date(x.getTime() - wd * DAY);
};
const fmt = (d: Date, o: Intl.DateTimeFormatOptions) => d.toLocaleDateString("en-IN", { timeZone: "UTC", ...o });

function Pick({ id, label, value, options, any }: { id: string; label: string; value?: string; options: FacetOption[]; any: string }) {
  return (
    <label className="block text-xs">
      <span className="label !mb-1 !text-[11px]">{label}</span>
      <select id={id} name={id} defaultValue={value ?? ""} className="field !min-h-8 !text-xs">
        <option value="">{any}</option>
        {options.map((o) => <option key={o.value} value={o.value}>{o.label} ({o.count})</option>)}
      </select>
    </label>
  );
}

async function Feed({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const user = await requireUser();
  const sb = await createClient();
  const [events, { prefs }, genres] = await Promise.all([loadFeedEvents(sb), loadPrefs(sb, user.id), loadGenres(sb)]);

  const past = one(sp.when) === "past";
  const favOnly = one(sp.fav) === "1";
  const filters: Filters = {
    genre: one(sp.genre),
    city: one(sp.city),
    type: one(sp.type),
    q: one(sp.q),
    scope: favOnly ? "mine" : "all", // the calendar shows EVERY show; Favourites narrows it
    when: past ? "past" : "upcoming",
    sort: "date",
  };
  const genreNames = new Map(genres.map((g) => [g.slug, g.name]));
  const facets = buildFacets(buildFeed(events, prefs, { scope: filters.scope, when: filters.when, sort: "date" }), genreNames);
  const items = buildFeed(events, prefs, filters).filter((i) => !i.event.is_sample);
  const favIds = new Set(prefs.followedArtistIds);

  // calendar week (Monday to Sunday) around the chosen date, default this week
  const today = new Date();
  const anchor = /^\d{4}-\d{2}-\d{2}$/.test(one(sp.week) ?? "") ? new Date(`${one(sp.week)}T00:00:00Z`) : today;
  const monday = mondayOf(anchor);
  const days = Array.from({ length: 7 }, (_, i) => new Date(monday.getTime() + i * DAY));
  const todayIso = iso(new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate())));
  const byDay = new Map<string, FeedItem[]>();
  const undated: FeedItem[] = [];
  for (const i of items) {
    if (!i.event.starts_at || i.event.date_precision === "month" || i.event.date_precision === "unknown") undated.push(i);
    else byDay.set(istDay(i.event.starts_at), [...(byDay.get(istDay(i.event.starts_at)) ?? []), i]);
  }
  const weekIsos = days.map(iso);
  const dayParam = one(sp.day);
  const selected = dayParam && weekIsos.includes(dayParam) ? dayParam : null;
  const shownDays = selected ? [selected] : weekIsos;
  const weekCount = weekIsos.reduce((n, d) => n + (byDay.get(d)?.length ?? 0), 0);

  const base = (over: Record<string, string | undefined>) => {
    const p = new URLSearchParams();
    for (const k of ["fav", "city", "genre", "type", "q", "when"]) if (one(sp[k])) p.set(k, one(sp[k]) as string);
    for (const [k, v] of Object.entries(over)) {
      if (v) p.set(k, v);
      else p.delete(k);
    }
    const s = p.toString();
    return s ? `/feed?${s}` : "/feed";
  };
  const prev = iso(new Date(monday.getTime() - 7 * DAY));
  const next = iso(new Date(monday.getTime() + 7 * DAY));
  const range = `${fmt(days[0], { day: "numeric", month: "short" })} – ${fmt(days[6], { day: "numeric", month: "short", year: "numeric" })}`;
  const nextWithShows = !past ? [...byDay.keys()].filter((d) => d > weekIsos[6]).sort()[0] : undefined;

  return (
    <div className="grid gap-5 lg:grid-cols-[13rem_1fr]">
      {/* left: small filter */}
      <aside aria-label="Filters">
        <form method="get" action="/feed" className="space-y-2.5 rounded-xl border border-line bg-surface p-3">
          <label className="flex items-center gap-2 text-xs font-semibold">
            <input type="checkbox" name="fav" value="1" defaultChecked={favOnly} /> Favourites only
          </label>
          <Pick id="city" label="City" value={filters.city} options={facets.cities} any="All cities" />
          <Pick id="genre" label="Genre" value={filters.genre} options={facets.genres} any="All genres" />
          <Pick id="type" label="Type" value={filters.type} options={facets.types} any="All types" />
          <label className="block text-xs">
            <span className="label !mb-1 !text-[11px]">Search</span>
            <input name="q" defaultValue={filters.q ?? ""} placeholder="Artist, venue, city" className="field !min-h-8 !text-xs" />
          </label>
          {past && <input type="hidden" name="when" value="past" />}
          <div className="flex items-center gap-2">
            <button type="submit" className="btn-primary !min-h-8 !px-3 text-xs">Apply</button>
            <Link href={past ? "/feed?when=past" : "/feed"} className="text-xs underline underline-offset-2 muted">Reset</Link>
          </div>
        </form>
        <p className="mt-3 text-xs muted">
          {past ? <Link href="/feed" className="underline underline-offset-2">Back to upcoming shows</Link> : <Link href="/feed?when=past" className="underline underline-offset-2">See past shows</Link>}
        </p>
      </aside>

      {/* right: week calendar */}
      <section aria-labelledby="cal">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h1 id="cal" className="!text-2xl sm:!text-3xl">{past ? "Past shows" : "Shows calendar"}</h1>
          <p className="text-xs muted">{items.length} {past ? "past" : "upcoming"} shows{favOnly ? " in your favourites" : " in India"}</p>
        </div>

        <div className="mt-3 flex items-center gap-2">
          <Link href={base({ week: prev, day: undefined })} className="btn-ghost !min-h-8 !px-3 text-xs" aria-label="Previous week">←</Link>
          <p className="min-w-0 flex-1 text-center text-sm font-semibold">{range}</p>
          <Link href={base({ week: next, day: undefined })} className="btn-ghost !min-h-8 !px-3 text-xs" aria-label="Next week">→</Link>
          <Link href={base({ week: undefined, day: undefined })} className="btn-ghost !min-h-8 !px-3 text-xs">Today</Link>
        </div>

        <ol className="mt-2 grid grid-cols-7 gap-1" aria-label="Days of the week">
          {days.map((d) => {
            const k = iso(d);
            const n = byDay.get(k)?.length ?? 0;
            const on = selected === k;
            return (
              <li key={k}>
                <Link
                  href={base({ week: weekIsos[0], day: on ? undefined : k })}
                  aria-current={on ? "date" : undefined}
                  className={`flex flex-col items-center rounded-lg border px-1 py-1.5 text-center ${on ? "border-lime bg-lime text-ink" : k === todayIso ? "border-lime/60" : "border-line"} hover:border-lime`}
                >
                  <span className="text-[10px] font-bold uppercase tracking-wider opacity-80">{fmt(d, { weekday: "short" })}</span>
                  <span className="display text-lg leading-none">{fmt(d, { day: "numeric" })}</span>
                  <span className={`mt-0.5 rounded-full px-1.5 text-[10px] font-bold ${n ? (on ? "bg-ink text-lime" : "bg-lime/20 text-lime") : "opacity-40"}`}>{n} {n === 1 ? "show" : "shows"}</span>
                </Link>
              </li>
            );
          })}
        </ol>
        <p className="mt-2 text-xs muted">
          {selected ? <>Showing {fmt(new Date(`${selected}T00:00:00Z`), { weekday: "long", day: "numeric", month: "long" })}. <Link href={base({ week: weekIsos[0], day: undefined })} className="underline underline-offset-2">Show the whole week</Link></> : <>Whole week: {weekCount} {weekCount === 1 ? "show" : "shows"}. Tap a day to see just that day.</>}
        </p>

        <div className="mt-3">
          {shownDays.every((d) => !byDay.get(d)?.length) ? (
            <div className="card !p-4 text-sm">
              <p>No shows {selected ? "on this day" : "this week"}{filters.city || filters.genre || filters.type || filters.q || favOnly ? " with these filters" : ""}.</p>
              <p className="mt-1 muted">
                {nextWithShows ? <>The next shows are in the week of <Link className="text-lime underline" href={base({ week: nextWithShows, day: undefined })}>{fmt(new Date(`${nextWithShows}T00:00:00Z`), { day: "numeric", month: "short" })}</Link>. </> : null}
                Use the arrows above to move through the weeks.
              </p>
            </div>
          ) : (
            shownDays.map((d) => {
              const list = byDay.get(d) ?? [];
              if (list.length === 0) return null;
              return (
                <div key={d} className="mb-3">
                  <h2 className="mono !text-xs">{fmt(new Date(`${d}T00:00:00Z`), { weekday: "long", day: "numeric", month: "long" })}</h2>
                  <ul>{list.map((i) => <EventRow key={i.event.id} item={i} favourite={i.event.artists.some((a) => favIds.has(a.id))} />)}</ul>
                </div>
              );
            })
          )}
        </div>

        {undated.length > 0 && (
          <details className="card mt-3 !p-3">
            <summary className="cursor-pointer text-sm font-bold">Date not announced yet ({undated.length})</summary>
            <ul className="mt-2">{undated.map((i) => <EventRow key={i.event.id} item={i} favourite={i.event.artists.some((a) => favIds.has(a.id))} />)}</ul>
          </details>
        )}
      </section>
    </div>
  );
}
