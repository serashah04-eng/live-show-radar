import { stripHtml } from "./feeds.ts";

/** Facts pulled from one piece of content. Every field is null/false unless the content states it. */
export interface Extracted {
  isEvent: boolean;
  artist: string | null;
  title: string | null;
  dateIso: string | null; // YYYY-MM-DD or YYYY-MM, only as stated
  dateText: string | null;
  venue: string | null;
  city: string | null;
  inIndia: boolean | null;
  saleStartText: string | null;
  earlyBird: { mentioned: boolean; excerpt: string | null; endsIso: string | null };
  cardOffers: string[];
  ticketUrl: string | null;
  change: { type: "cancelled" | "postponed" | "rescheduled" | "venue_changed" | null; excerpt: string | null };
  excerpt: string | null;
  /** "structured" = read directly from schema.org JSON-LD (no AI); "ai" = read from text by Gemini. */
  method: "structured" | "ai";
}

const empty = (method: Extracted["method"]): Extracted => ({
  isEvent: false, artist: null, title: null, dateIso: null, dateText: null, venue: null, city: null, inIndia: null, saleStartText: null,
  earlyBird: { mentioned: false, excerpt: null, endsIso: null }, cardOffers: [], ticketUrl: null, change: { type: null, excerpt: null }, excerpt: null, method,
});

const s = (v: unknown): string | null => (typeof v === "string" && v.trim() ? v.trim() : null);
const pickDate = (v: unknown): { iso: string | null; text: string | null } => {
  const t = s(v);
  if (!t) return { iso: null, text: null };
  const m = t.match(/^(\d{4}-\d{2}-\d{2})/);
  return { iso: m ? m[1] : null, text: t };
};

/** schema.org Event -> facts, no AI involved. Offers named "early bird" with a validThrough give an explicit deadline. */
export function fromJsonLd(ev: Record<string, unknown>, pageUrl: string): Extracted {
  const out = empty("structured");
  out.isEvent = true;
  out.title = s(ev.name);
  const d = pickDate(ev.startDate);
  out.dateIso = d.iso;
  out.dateText = d.text;
  const loc = (Array.isArray(ev.location) ? ev.location[0] : ev.location) as Record<string, unknown> | undefined;
  out.venue = s(loc?.name);
  const addr = loc?.address as Record<string, unknown> | string | undefined;
  out.city = typeof addr === "string" ? null : s(addr?.addressLocality);
  const country = typeof addr === "string" ? null : s(addr?.addressCountry);
  out.inIndia = country ? /^(in|ind|india)$/i.test(country) : null;
  const performer = (Array.isArray(ev.performer) ? ev.performer[0] : ev.performer) as Record<string, unknown> | string | undefined;
  out.artist = typeof performer === "string" ? performer : s(performer?.name);
  out.ticketUrl = s(ev.url) ?? pageUrl;
  const offers = (Array.isArray(ev.offers) ? ev.offers : ev.offers ? [ev.offers] : []) as Record<string, unknown>[];
  for (const o of offers) {
    const name = `${s(o.name) ?? ""} ${s(o.category) ?? ""}`;
    if (/early[\s-]?bird/i.test(name)) {
      out.earlyBird = { mentioned: true, excerpt: `Offer "${(s(o.name) ?? "early bird").slice(0, 80)}"${s(o.price) ? ` at ${s(o.price)} ${s(o.priceCurrency) ?? ""}` : ""}`.trim(), endsIso: s(o.validThrough) };
    }
    if (!out.saleStartText && s(o.validFrom)) out.saleStartText = `sale from ${s(o.validFrom)}`;
  }
  const status = s(ev.eventStatus) ?? "";
  if (/cancel/i.test(status)) out.change = { type: "cancelled", excerpt: "eventStatus: EventCancelled" };
  else if (/postpone/i.test(status)) out.change = { type: "postponed", excerpt: "eventStatus: EventPostponed" };
  else if (/reschedul/i.test(status)) out.change = { type: "rescheduled", excerpt: "eventStatus: EventRescheduled" };
  out.excerpt = s(ev.description) ? stripHtml(String(ev.description)).slice(0, 300) : null;
  return out;
}

const PROMPT = (title: string, text: string, published: string | null, url: string) => `You extract facts about ONE live event from the content below. Use ONLY what the content states. If a field is not stated, use null (or false/[]). Never infer, guess or invent anything. Reply with JSON only.

Source URL: ${url}
Published: ${published ?? "unknown"}
Title: ${title}
Content:
"""
${text.slice(0, 6000)}
"""

JSON shape:
{"is_event":boolean (true only if this announces, teases or gives sale details for a specific live event),
 "artist":string|null,"title":string|null,"date_iso":"YYYY-MM-DD"|"YYYY-MM"|null,"date_text":string|null,
 "venue":string|null,"city":string|null,"in_india":boolean|null (true only if the venue or city is in India),
 "sale_start_text":string|null (presale or general sale start exactly as written),
 "early_bird":{"mentioned":boolean,"excerpt":string|null (short phrase copied from the content),"ends_iso":"YYYY-MM-DD"|null (only if an end date is stated)},
 "card_offers":string[] (card/bank presale offers stated),"ticket_url":string|null,
 "change":{"type":"cancelled"|"postponed"|"rescheduled"|"venue_changed"|null,"excerpt":string|null},
 "excerpt":string|null (one short phrase copied from the content that supports the event)}`;

/** Gemini Flash reads the text (no web search, so it works even when the search quota is used up). */
export async function extractWithGemini(
  input: { title: string; text: string; published: string | null; url: string },
  opts: { apiKey: string; model?: string },
): Promise<Extracted> {
  const model = opts.model ?? "gemini-flash-latest";
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-goog-api-key": opts.apiKey },
    body: JSON.stringify({
      contents: [{ parts: [{ text: PROMPT(input.title, input.text, input.published, input.url) }] }],
      generationConfig: { responseMimeType: "application/json", temperature: 0 },
    }),
  });
  if (!res.ok) throw new Error(`Gemini HTTP ${res.status}`);
  const j = await res.json();
  const raw = j?.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text ?? "").join("") ?? "";
  let o: Record<string, unknown>;
  try {
    o = JSON.parse(raw);
  } catch {
    return empty("ai");
  }
  const out = empty("ai");
  out.isEvent = o.is_event === true;
  out.artist = s(o.artist);
  out.title = s(o.title);
  const d = pickDate(o.date_iso);
  out.dateIso = d.iso ?? (typeof o.date_iso === "string" && /^\d{4}-\d{2}$/.test(o.date_iso) ? o.date_iso : null);
  out.dateText = s(o.date_text);
  out.venue = s(o.venue);
  out.city = s(o.city);
  out.inIndia = typeof o.in_india === "boolean" ? o.in_india : null;
  out.saleStartText = s(o.sale_start_text);
  const eb = (o.early_bird ?? {}) as Record<string, unknown>;
  out.earlyBird = { mentioned: eb.mentioned === true, excerpt: s(eb.excerpt), endsIso: pickDate(eb.ends_iso).iso };
  out.cardOffers = Array.isArray(o.card_offers) ? o.card_offers.filter((x): x is string => typeof x === "string").slice(0, 5) : [];
  out.ticketUrl = s(o.ticket_url);
  const ch = (o.change ?? {}) as Record<string, unknown>;
  out.change = { type: ["cancelled", "postponed", "rescheduled", "venue_changed"].includes(String(ch.type)) ? (ch.type as Extracted["change"]["type"]) : null, excerpt: s(ch.excerpt) };
  out.excerpt = s(o.excerpt);
  return out;
}
