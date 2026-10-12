import Link from "next/link";
import type { FeedItem } from "@/lib/feed";
import { eventDateParts } from "@/lib/format";
import { ArtistAvatar } from "./ArtistAvatar";
import { EventLinks } from "./EventLinks";
import { FavHeart } from "./FavHeart";
import { StatusBadge } from "./StatusBadge";

/** Compact show row used by the calendar feed and search: photo, name, status tag, where/when, and the three links. */
export function EventRow({ item, favourite = false }: { item: FeedItem; favourite?: boolean }) {
  const e = item.event;
  const d = eventDateParts(e);
  const name = e.artists.map((a) => a.name).join(" + ") || e.title;
  return (
    <li className="flex gap-3 border-b border-line py-3 last:border-0">
      <ArtistAvatar name={e.artists[0]?.name ?? e.title} size={44} />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <Link href={`/events/${e.id}`} className="font-bold leading-tight hover:text-lime">{name}</Link>
          <StatusBadge event={e} />
        </div>
        <p className="mt-0.5 text-xs muted">{d.full} · {e.city ?? "City not announced"}{e.venue ? ` · ${e.venue}` : ""}</p>
        <div className="mt-1.5 flex flex-wrap items-center gap-2"><EventLinks e={e} />{e.artists[0] && <FavHeart artistId={e.artists[0].id} name={e.artists[0].name} initial={favourite} />}</div>
      </div>
    </li>
  );
}
