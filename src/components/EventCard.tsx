import Link from "next/link";
import type { FeedItem } from "@/lib/feed";
import { eventDateParts, formatDateTime, TICKET_STATUS_LABEL, timeAgo } from "@/lib/format";
import { StatusBadge } from "./StatusBadge";

export function EventCard({ item }: { item: FeedItem }) {
  const e = item.event;
  const d = eventDateParts(e);
  const { deadline, urgent } = item;
  const artistNames = e.artists.map((a) => a.name).join(" + ");

  return (
    <article className="ticket rise">
      <div className="ticket-date" aria-hidden={d.month === ""}>
        <span className="display text-3xl">{d.day}</span>
        <span className="text-xs font-bold tracking-widest muted">{d.month}</span>
        <span className="text-[10px] muted">{d.year}</span>
      </div>
      <div className="min-w-0 p-4 pl-6">
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <StatusBadge event={e} />
          {deadline !== null && (
            <span className={urgent ? "badge-urgent" : "badge-verified"}>
              Early bird ends {formatDateTime(new Date(deadline).toISOString())}
            </span>
          )}
          {e.ticket_status !== "unknown" && <span className="badge-pending">{TICKET_STATUS_LABEL[e.ticket_status]}</span>}
        </div>
        <h3 className="text-xl sm:text-2xl">
          <Link href={`/events/${e.id}`} className="hover:text-cobalt-soft focus-visible:text-cobalt-soft">
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
        <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs muted">
          <span>
            {e.sources.length} source{e.sources.length === 1 ? "" : "s"}
          </span>
          <span>Checked {timeAgo(e.last_checked_at)}</span>
          {e.sources[0] && (
            <a href={e.sources[0].url} target="_blank" rel="noopener noreferrer" className="text-cobalt-soft underline underline-offset-2">
              Open source{e.sources[0].title ? ` (${e.sources[0].title})` : ""}
            </a>
          )}
        </p>
      </div>
    </article>
  );
}
