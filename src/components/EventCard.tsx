import Link from "next/link";
import { bookingLink, isPlaceholder, locationLink, type FeedItem } from "@/lib/feed";
import { sourceLinks } from "@/lib/links";
import { eventDateParts, formatDateTime, TICKET_STATUS_LABEL, timeAgo } from "@/lib/format";
import { ArtistAvatar } from "./ArtistAvatar";
import { BookButton } from "./BookButton";
import { StatusBadge } from "./StatusBadge";

export function EventCard({ item }: { item: FeedItem }) {
  const e = item.event;
  const d = eventDateParts(e);
  const { deadline, urgent } = item;
  const artistNames = e.artists.map((a) => a.name).join(" + ");
  const link = bookingLink(e);
  const placeholder = isPlaceholder(e);
  const where = locationLink(e);
  const src = sourceLinks(e.sources).filter((s) => s.url !== link?.url)[0] ?? null;

  return (
    <article className="ticket rise">
      <div className="ticket-date" aria-hidden={d.month === ""}>
        <span className="display text-3xl">{d.day}</span>
        <span className="text-xs font-bold tracking-widest muted">{d.month}</span>
        <span className="text-[10px] muted">{d.year}</span>
      </div>
      <div className="min-w-0 p-4 pl-6">
        <div className="mb-2 flex flex-wrap items-center gap-2">
          {placeholder && <span className="badge-warn">[Placeholder] sample data</span>}
          {item.isPast && !placeholder && <span className="badge-pending">Past show</span>}
          {item.cityRank === 0 && <span className="badge-lime">Your top city</span>}
          <StatusBadge event={e} />
          {deadline !== null && (
            <span className={urgent ? "badge-urgent" : "badge-verified"}>
              Early bird ends {formatDateTime(new Date(deadline).toISOString())}
            </span>
          )}
          {e.ticket_status !== "unknown" && <span className="badge-pending">{TICKET_STATUS_LABEL[e.ticket_status]}</span>}
        </div>
        <h3 className="flex items-center gap-3 text-xl sm:text-2xl">
          <ArtistAvatar name={e.artists[0]?.name ?? e.title} size={44} />
          {placeholder ? <span>{artistNames || e.title}</span> : (
            <Link href={`/events/${e.id}`} className="hover:text-lime focus-visible:text-lime">
              {artistNames || e.title}
            </Link>
          )}
        </h3>
        <p className="mt-1 text-sm">{e.title}</p>
        <p className="mt-1 text-sm muted">
          {e.venue ?? "Venue not stated"} · {e.city ?? "City not stated"} · {d.full}
        </p>
        {item.reasons.length > 0 && (
          <p className="mt-2 text-xs muted">
            <span className="font-semibold">Why you see this:</span> {item.reasons.join(" · ")}
          </p>
        )}
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {placeholder ? (
            <span className="badge-pending">No booking link: this is a placeholder, not a real show</span>
          ) : (
            <>
              {!item.isPast && <BookButton link={link} />}
              {where && <a href={where.url} target="_blank" rel="noopener noreferrer" className="btn-ghost min-h-10 px-4">Location</a>}
              {src && <a href={src.url} target="_blank" rel="noopener noreferrer" className="btn-ghost min-h-10 px-4" title={src.note}>{item.isPast ? "Read the source" : "Source"}: {src.host}{src.credibility === "unvetted" ? " (unverified)" : ""}</a>}
              <Link href={`/events/${e.id}`} className="btn-ghost min-h-10 px-4">Details</Link>
              <span className="text-xs muted">
                {e.sources.length} source{e.sources.length === 1 ? "" : "s"} · checked {timeAgo(e.last_checked_at)}
              </span>
            </>
          )}
        </div>
      </div>
    </article>
  );
}
