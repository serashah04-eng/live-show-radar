import "server-only";
import { tierFor } from "@/lib/monitor/tiers";

export interface SourceLink {
  url: string;
  host: string;
  title: string | null;
  /** 1-2 vetted credible, 3 community/aggregator, 0 not in the vetted list */
  tier: number;
  credibility: "credible" | "lower" | "unvetted";
  note: string;
}

export const UNVETTED_NOTE = "Non-credible or unverified source. Please check the official ticketer or promoter before acting.";

/** Every stored source of an event with a credibility label from the vetted source list (credible first). */
export function sourceLinks(sources: { url: string; title: string | null }[]): SourceLink[] {
  return sources
    .map((s) => {
      const t = tierFor(s.url);
      const credibility: SourceLink["credibility"] = t.tier === 1 || t.tier === 2 ? "credible" : t.tier === 3 ? "lower" : "unvetted";
      return {
        url: s.url,
        host: t.domain,
        title: s.title,
        tier: t.tier,
        credibility,
        note: credibility === "credible" ? "Vetted source" : credibility === "lower" ? "Community or aggregator listing: check the official ticketer" : UNVETTED_NOTE,
      };
    })
    .sort((a, b) => (a.tier || 9) - (b.tier || 9));
}
