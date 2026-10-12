import { normalizeCity, parseDateField } from "../normalize.ts";
import type { RawDiscovery } from "../types.ts";

export interface ManualSubmission {
  url: string; // public event page the user found (e.g. a BookMyShow/District/SkillBox listing)
  artist: string;
  title?: string;
  dateIso?: string | null; // YYYY-MM-DD or YYYY-MM, as read by the user from the page
  dateText?: string | null;
  venue?: string | null;
  city?: string | null;
  ticketUrl?: string | null;
  note?: string | null;
}

/**
 * "Add event by link". The page is NOT fetched or scraped: we store the URL the user
 * supplied plus whatever details they typed. It always enters the review queue.
 */
export function manualToRaw(m: ManualSubmission): RawDiscovery {
  let host: string;
  try {
    const u = new URL(m.url);
    if (u.protocol !== "https:" && u.protocol !== "http:") throw new Error("bad protocol");
    host = u.hostname.replace(/^www\./, "");
  } catch {
    throw new Error("Please enter a valid public event URL (https://...)");
  }
  if (!m.artist?.trim()) throw new Error("Artist name is required");
  const d = parseDateField(m.dateIso ?? null);
  return {
    artistNames: [m.artist.trim()],
    title: m.title?.trim() || `${m.artist.trim()} live`,
    dateText: m.dateText ?? null,
    startsAt: d.startsAt,
    datePrecision: d.precision,
    dateBucket: d.bucket,
    venue: m.venue?.trim() || null,
    city: normalizeCity(m.city),
    ticketUrl: m.ticketUrl ?? null,
    sourceUrl: m.url,
    sourceTitle: host,
    externalId: null,
    discoverySource: "manual_submission",
    excerpt: m.note ?? null,
    aiReported: false,
    officialApiRecord: false,
  };
}
