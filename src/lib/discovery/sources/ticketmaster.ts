import { normalizeCity, parseDateField, isPast } from "../normalize.ts";
import type { DiscoveryContext, RawDiscovery, SourceAdapter } from "../types.ts";

interface TmEvent {
  id: string;
  name: string;
  url?: string;
  dates?: { start?: { localDate?: string; dateTime?: string; dateTBA?: boolean; noSpecificTime?: boolean } };
  _embedded?: {
    venues?: { name?: string; city?: { name?: string }; country?: { countryCode?: string } }[];
    attractions?: { name?: string }[];
  };
}

/**
 * Ticketmaster Discovery API (official, keyed). Searches each followed artist by
 * keyword worldwide and keeps only events whose venue country is India.
 * Coverage of Indian events is known to be thin; this adapter reports what exists.
 */
export function createTicketmasterAdapter(opts: { apiKey: string; delayMs?: number }): SourceAdapter {
  return {
    name: "ticketmaster",
    async discover(ctx: DiscoveryContext): Promise<RawDiscovery[]> {
      const out: RawDiscovery[] = [];
      for (const artist of ctx.artists) {
        const u = new URL("https://app.ticketmaster.com/discovery/v2/events.json");
        u.search = new URLSearchParams({
          apikey: opts.apiKey,
          keyword: artist.name,
          size: "50",
          sort: "date,asc",
          startDateTime: ctx.today.toISOString().replace(/\.\d+Z$/, "Z"),
        }).toString();
        const res = await fetch(u);
        if (!res.ok) throw new Error(`Ticketmaster HTTP ${res.status} for ${artist.name}`);
        const j = await res.json();
        const events: TmEvent[] = j?._embedded?.events ?? [];
        for (const e of events) {
          const venue = e._embedded?.venues?.[0];
          if (venue?.country?.countryCode !== "IN") continue;
          const s = e.dates?.start;
          const d = parseDateField(s?.dateTime ?? s?.localDate ?? null);
          if (isPast(d.startsAt, ctx.today)) continue;
          out.push({
            artistNames: (e._embedded?.attractions ?? []).map((a) => a.name ?? "").filter(Boolean),
            title: e.name,
            dateText: s?.localDate ?? null,
            startsAt: d.startsAt,
            datePrecision: d.precision,
            dateBucket: d.bucket,
            venue: venue?.name ?? null,
            city: normalizeCity(venue?.city?.name),
            ticketUrl: e.url ?? null,
            sourceUrl: e.url ?? `https://www.ticketmaster.com/event/${e.id}`,
            sourceTitle: "ticketmaster.com",
            externalId: e.id,
            discoverySource: "ticketmaster",
            excerpt: null,
            aiReported: false,
            officialApiRecord: true,
          });
        }
        if (opts.delayMs) await new Promise((r) => setTimeout(r, opts.delayMs));
      }
      return out;
    },
  };
}
