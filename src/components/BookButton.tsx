import type { BookingLink } from "@/lib/feed";

/**
 * "Book show" sends the user to the page where they can buy. We never sell tickets and never claim
 * availability: when the link is a listing page rather than a stored ticket URL, we say so.
 */
export function BookButton({ link, large = false }: { link: BookingLink | null; large?: boolean }) {
  if (!link) {
    return (
      <span className="badge-pending" title="No booking page has been found for this show yet">
        No booking link yet
      </span>
    );
  }
  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      <a
        href={link.url}
        target="_blank"
        rel="noopener noreferrer"
        className={`btn-primary arrow ${large ? "min-h-12 px-7 text-base" : "min-h-10"}`}
      >
        Book show
        <span className="sr-only"> (opens {link.host} in a new tab)</span>
      </a>
      <span className="text-xs muted">
        {link.kind === "ticket" ? `Tickets on ${link.host}` : `Listed on ${link.host}: check availability there`}
      </span>
    </span>
  );
}
