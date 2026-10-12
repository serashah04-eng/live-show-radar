import Link from "next/link";
import type { FeedItem } from "@/lib/feed";
import { eventDateParts, timeAgo } from "@/lib/format";
import { ArtistAvatar } from "./ArtistAvatar";
import { EventLinks } from "./EventLinks";
import { StatusBadge } from "./StatusBadge";

const monthKey = (iso: string | null) => (iso ? iso.slice(0, 7) : "later");
const monthLabel = (k: string) => (k === "later" ? "Date to be announced" : new Date(`${k}-01T00:00:00Z`).toLocaleString("en-IN", { month: "long", year: "numeric", timeZone: "UTC" }));

function Row({ item, followed }: { item: FeedItem; followed: Set<string> }) {
  const e = item.event;
  const d = eventDateParts(e);
  const name = e.artists.map((a) => a.name).join(" + ") || e.title;
  const mine = e.artists.some((a) => followed.has(a.id));
  return (
    <li className="flex gap-3 border-b border-line py-3 last:border-0">
      <ArtistAvatar name={e.artists[0]?.name ?? e.title} size={52} />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <Link href={`/events/${e.id}`} className="text-lg font-bold leading-tight hover:text-lime">{name}</Link>
          {mine && <span className="badge-lime">You follow</span>}
          <StatusBadge event={e} />
        </div>
        <p className="mt-0.5 text-sm muted">{d.full} · {e.city ?? "City not announced"}{e.venue ? ` · ${e.venue}` : ""}</p>
        <div className="mt-2"><EventLinks e={e} /></div>
      </div>
    </li>
  );
}

/** Top of the home page: what was just found, then a month-by-month calendar. Everything links through. */
export function Newsroom({ upcoming, followedIds }: { upcoming: FeedItem[]; followedIds: string[] }) {
  const followed = new Set(followedIds);
  const seen = new Set<string>();
  const justFound = [...upcoming]
    .sort((a, b) => +new Date(b.event.discovered_at) - +new Date(a.event.discovered_at))
    .filter((i) => {
      const k = i.event.artists[0]?.id ?? i.event.id; // one show per artist so one tour does not fill the list
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    })
    .slice(0, 6);
  const byDate = [...upcoming].sort((a, b) => (a.event.starts_at ?? "9").localeCompare(b.event.starts_at ?? "9")).slice(0, 14);
  const groups = new Map<string, FeedItem[]>();
  for (const i of byDate) {
    const k = monthKey(i.event.starts_at);
    groups.set(k, [...(groups.get(k) ?? []), i]);
  }
  const newest = justFound[0]?.event.discovered_at;

  return (
    <section aria-labelledby="newsroom">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="section-no">Newsroom</p>
          <h1 id="newsroom" className="text-4xl sm:text-6xl">Coming up in India</h1>
        </div>
        <p className="mono">{upcoming.length} upcoming shows{newest ? ` · latest find ${timeAgo(newest)}` : ""}</p>
      </div>
      {upcoming.length === 0 ? (
        <p className="card muted">No upcoming shows found yet. Pick artists and tap Find shows, and they appear here.</p>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[1.25fr_1fr]">
          <div className="card">
            <h2 className="text-2xl">Just found</h2>
            <p className="mb-1 text-xs muted">The newest shows our searches picked up. Each one keeps its source; check it before you act.</p>
            <ul>{justFound.map((i) => <Row key={i.event.id} item={i} followed={followed} />)}</ul>
          </div>
          <div className="card">
            <div className="flex items-baseline justify-between gap-2">
              <h2 className="text-2xl">Calendar</h2>
              <Link href="/feed?scope=all" className="mono underline underline-offset-2">Everything</Link>
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
        </div>
      )}
    </section>
  );
}
