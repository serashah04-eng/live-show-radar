export type DiscoverySource = "gemini_grounding" | "ticketmaster" | "manual_submission" | "other";
export type DatePrecision = "exact" | "day" | "month" | "unknown";

/** One event candidate as reported by a source, before matching and persistence. */
export interface RawDiscovery {
  artistNames: string[];
  title: string;
  dateText: string | null; // exactly as stated by the source
  startsAt: string | null; // ISO timestamp, only when the source states a full date
  datePrecision: DatePrecision;
  dateBucket: string; // YYYY-MM-DD, YYYY-MM or "unknown" (used for deduplication)
  venue: string | null;
  city: string | null;
  ticketUrl: string | null;
  sourceUrl: string;
  sourceTitle: string | null;
  externalId: string | null;
  discoverySource: DiscoverySource;
  excerpt: string | null; // text that supports the details
  aiReported: boolean; // true = produced by an AI model, never auto-verified
  officialApiRecord: boolean; // true = structured record from a permitted official API
}

export interface ArtistRecord {
  id: string;
  name: string;
  normalizedName: string;
  aliases: string[]; // normalized
}

export interface DiscoveryContext {
  artists: ArtistRecord[];
  today: Date;
}

export interface SourceAdapter {
  name: string;
  discover(ctx: DiscoveryContext): Promise<RawDiscovery[]>;
}

export interface AdapterRunResult {
  source: string;
  status: "success" | "partial" | "failed";
  found: number;
  created: number;
  error: string | null;
}
