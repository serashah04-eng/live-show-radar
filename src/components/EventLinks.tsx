import { bookingLink, locationLink, type FeedEvent } from "@/lib/feed";
import { sourceLinks } from "@/lib/links";

/** The three links every show needs: tickets (a ticketing site only), location, and the page we found it on. */
export function EventLinks({ e }: { e: FeedEvent }) {
  const tix = bookingLink(e);
  const where = locationLink(e);
  const src = sourceLinks(e.sources).find((s) => s.url !== tix?.url) ?? null;
  const pill = "inline-flex min-h-8 items-center rounded-full border border-line px-3 text-xs font-semibold hover:border-lime hover:text-lime";
  return (
    <span className="flex flex-wrap items-center gap-1.5">
      {tix ? (
        <a href={tix.url} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-8 items-center rounded-full bg-lime px-3 text-xs font-bold text-ink">
          Tickets<span className="sr-only"> on {tix.host}</span>
        </a>
      ) : (
        <span className="inline-flex min-h-8 items-center rounded-full border border-dashed border-line px-3 text-xs muted">Tickets not announced</span>
      )}
      {where && <a href={where.url} target="_blank" rel="noopener noreferrer" className={pill}>Map</a>}
      {src && (
        <a href={src.url} target="_blank" rel="noopener noreferrer" className={pill} title={src.note}>
          {src.host}{src.credibility === "unvetted" ? " (unverified)" : ""}
        </a>
      )}
    </span>
  );
}
