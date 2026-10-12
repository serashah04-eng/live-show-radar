import type { BookingLink } from "@/lib/feed";

/**
 * "Book show" only ever points at a ticketing site. When no ticketing page is known the button is replaced by an honest
 * "tickets not announced" note, never by a news article. We never sell tickets and never claim availability.
 */
export function BookButton({ link, large = false }: { link: BookingLink | null; large?: boolean }) {
  if (!link) {
    return (
      <span className="badge-pending" title="No ticketing page has been found for this show">
        Tickets not announced yet
      </span>
    );
  }
  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      <a
        href={link.url}
        target="_blank"
        rel="noopener noreferrer"
        className={`btn-primary arrow ${large ? "min-h-9 px-4 text-sm" : "min-h-8"}`}
      >
        Book show
        <span className="sr-only"> (opens {link.host} in a new tab)</span>
      </a>
      <span className="text-xs muted">
        {link.kind === "ticket" ? `Tickets on ${link.host}` : `Ticketing page on ${link.host}: check it lists this show`}
      </span>
    </span>
  );
}
