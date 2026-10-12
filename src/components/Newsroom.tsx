import Link from "next/link";
import type { FeedItem } from "@/lib/feed";
import { eventDateParts, timeAgo } from "@/lib/format";
import { ArtistPhoto } from "./ArtistPhoto";
import { EventLinks } from "./EventLinks";
import { FavHeart } from "./FavHeart";
import { StatusBadge } from "./StatusBadge";

const monthKey = (iso: string | null) => (iso ? iso.slice(0, 7) : "later");
const monthLabel = (k: string) => (k === "later" ? "Date to be announced" : new Date(`${k}-01T00:00:00Z`).toLocaleString("en-IN", { month: "long", year: "numeric", timeZone: "UTC" }));

/** A music-app style card: big photo, name, date and place, a heart, and a status tag. */
function PhotoCard({ item, fav }: { item: FeedItem; fav: boolean }) {
  const e = item.event;
  const a = e.artists[0];
  const d = eventDateParts(e);
  const name = e.artists.map((x) => x.name).join(" + ") || e.title;
  return (
    <li className="w-40 shrink-0 snap-start sm:w-44">
      <div className="group relative">
        <Link href={`/events/${e.id}`} className="block aspect-square overflow-hidden rounded-2xl border border-line transition group-hover:-translate-y-1 group-hover:rotate-1 group-hover:shadow-[0_10px_0_rgba(0,0,0,0.25)]" aria-label={`${name}, ${d.full}`}>
          <ArtistPhoto name={a?.name ?? e.title} />
        </Link>
        <span className="pointer-events-none absolute left-2 top-2 rounded-lg bg-lime px-1.5 py-0.5 text-center text-ink shadow-[2px_2px_0_rgba(0,0,0,0.4)]">
          <span className="display block text-lg leading-none">{d.day}</span>
          <span className="block text-[9px] font-extrabold tracking-widest">{d.month}</span>
        </span>
        {a && <FavHeart artistId={a.id} name={a.name} initial={fav} className="absolute right-2 top-2" />}
      </div>
      <Link href={`/events/${e.id}`} className="mt-2 block truncate text-sm font-bold hover:text-lime">{name}</Link>
      <p className="truncate text-xs muted">{e.city ?? "City TBA"}{e.venue ? ` · ${e.venue}` : ""}</p>
      <div className="mt-1"><StatusBadge event={e} /></div>
    </li>
  );
}

/** Top of the dashboard below the hero: a strip of newly found shows with photos, then a month-by-month calendar. */
export function Newsroom({ upcoming, followedIds, showAll }: { upcoming: FeedItem[]; followedIds: string[]; showAll: boolean }) {
  const followed = new Set(followedIds);
  const seen = new Set<string>();
  const justFound = [...upcoming]
    .sort((a, b) => +new Date(b.event.discovered_at) - +new Date(a.event.discovered_at))
    .filter((i) => {
      const k = i.event.artists[0]?.id ?? i.event.id; // one show per artist so one tour does not fill the strip
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    })
    .slice(0, 12);
  const byDate = [...upcoming].sort((a, b) => (a.event.starts_at ?? "9").localeCompare(b.event.starts_at ?? "9")).slice(0, 14);
  const groups = new Map<string, FeedItem[]>();
  for (const i of byDate) {
    const k = monthKey(i.event.starts_at);
    groups.set(k, [...(groups.get(k) ?? []), i]);
  }
  const newest = justFound[0]?.event.discovered_at;

  return (
    <section aria-labelledby="newsroom" className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="sticker !static inline-block">Fresh finds</p>
          <h2 id="newsroom" className="mt-1">{showAll ? "Every show in India" : "Your favourites, coming up"}</h2>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <p className="text-xs muted">{upcoming.length} upcoming shows{newest ? ` · newest added ${timeAgo(newest)}` : ""}</p>
          {showAll ? <Link href="/" className="btn-ghost">Back to favourites</Link> : <Link href="/?all=1" className="btn-primary">Show all genres and artists</Link>}
        </div>
      </div>

      {upcoming.length === 0 ? (
        <div className="card">
          <p>{showAll ? "No upcoming shows found yet." : "None of your favourite artists has an announced India show yet."}</p>
          <p className="mt-1 text-sm muted">{showAll ? "We keep searching every 30 minutes." : "That is normal: we keep watching and will alert you the moment one is announced. Want to see what else is on?"}</p>
          {!showAll && <Link href="/?all=1" className="btn-primary mt-3">Show all genres and artists</Link>}
        </div>
      ) : (
        <>
          <ul className="-mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-3 sm:mx-0 sm:px-0" aria-label="Newly found shows">
            {justFound.map((i) => <PhotoCard key={i.event.id} item={i} fav={i.event.artists.some((a) => followed.has(a.id))} />)}
          </ul>

          <div className="card">
            <div className="flex items-baseline justify-between gap-2">
              <h2>Calendar</h2>
              <Link href="/feed" className="mono underline underline-offset-2">Open the full calendar</Link>
            </div>
            {[...groups.entries()].map(([k, items]) => (
              <div key={k} className="mt-3">
                <p className="mono !text-lime">{monthLabel(k)}</p>
                <ul>
                  {items.map((i) => {
                    const d = eventDateParts(i.event);
                    return (
                      <li key={i.event.id} className="flex items-start gap-3 border-b border-line py-2 last:border-0">
                        <span className="w-10 shrink-0 text-center"><span className="display block text-2xl leading-none">{d.day}</span><span className="text-[10px] font-bold tracking-widest muted">{d.month}</span></span>
                        <span className="min-w-0 flex-1">
                          <Link href={`/events/${i.event.id}`} className="block truncate font-semibold hover:text-lime">{i.event.artists.map((a) => a.name).join(" + ") || i.event.title}</Link>
                          <span className="block truncate text-xs muted">{i.event.city ?? "City not announced"}{i.event.venue ? ` · ${i.event.venue}` : ""}</span>
                          <span className="mt-1 block"><EventLinks e={i.event} /></span>
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
        </>
      )}
    </section>
  );
}
