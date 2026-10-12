import Link from "next/link";
import { bookingLink, type FeedItem } from "@/lib/feed";
import { eventDateParts, formatDateTime, TICKET_STATUS_LABEL, timeAgo } from "@/lib/format";
import { BookButton } from "./BookButton";
import { StatusBadge } from "./StatusBadge";

export function EventCard({ item }: { item: FeedItem }) {
  const e = item.event;
  const d = eventDateParts(e);
  const { deadline, urgent } = item;
  const artistNames = e.artists.map((a) => a.name).join(" + ");
  const link = bookingLink(e);

  return (
    <article className="ticket rise">
      <div className="ticket-date" aria-hidden={d.month === ""}>
        <span className="display text-3xl">{d.day}</span>
        <span className="text-xs font-bold tracking-widest muted">{d.month}</span>
        <span className="text-[10px] muted">{d.year}</span>
      </div>
      <div className="min-w-0 p-4 pl-6">
        <div className="mb-2 flex flex-wrap items-center gap-2">
          {item.cityRank === 0 && <span className="badge-lime">Your top city</span>}
          <StatusBadge event={e} />
          {deadline !== null && (
            <span className={urgent ? "badge-urgent" : "badge-verified"}>
              Early bird ends {formatDateTime(new Date(deadline).toISOString())}
            </span>
          )}
          {e.ticket_status !== "unknown" && <span className="badge-pending">{TICKET_STATUS_LABEL[e.ticket_status]}</span>}
        </div>
        <h3 className="text-xl sm:text-2xl">
          <Link href={`/events/${e.id}`} className="hover:text-lime focus-visible:text-lime">
            {artistNames || e.title}
          </Link>
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
          <BookButton link={link} />
          <Link href={`/events/${e.id}`} className="btn-ghost min-h-10 px-4">Details</Link>
          <span className="text-xs muted">
            {e.sources.length} source{e.sources.length === 1 ? "" : "s"} · checked {timeAgo(e.last_checked_at)}
          </span>
        </div>
      </div>
    </article>
  );
}
