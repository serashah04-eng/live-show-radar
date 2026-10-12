import type { FeedEvent } from "@/lib/feed";

/** One badge that never overstates certainty. Orange urgency is reserved for VERIFIED early-bird deadlines. */
export function StatusBadge({ event }: { event: Pick<FeedEvent, "verification_status" | "corroborated" | "has_conflict" | "is_sample"> }) {
  if (event.is_sample) return <span className="badge-warn">Sample data</span>;
  if (event.has_conflict) return <span className="badge-warn">Sources disagree</span>;
  switch (event.verification_status) {
    case "verified":
      return <span className="badge-verified">Verified</span>;
    case "cancelled":
      return <span className="badge-warn">Cancelled</span>;
    case "stale":
      return <span className="badge-warn">Stale</span>;
    default:
      return event.corroborated ? (
        <span className="badge-corroborated" title="Two independent websites report this. Not confirmed by the owner or an official API.">
          Reported by 2+ sites
        </span>
      ) : (
        <span className="badge-pending" title="Found by search. Not yet confirmed.">
          Unconfirmed
        </span>
      );
  }
}
