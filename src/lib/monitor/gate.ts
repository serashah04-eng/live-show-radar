import {
  ANNOUNCEMENT, CARD_BANK, CHANGES, EVENT_TYPES, FOREIGN_PLACES, INDIA_CITY_TERMS, INDIA_STATES, NEGATIVE, SEED_VENUES, SOFT_LAUNCH, TICKET_SALE,
  type Venue,
} from "./keywords.ts";

const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const cache = new Map<string, RegExp>();
/** Case-insensitive, word-bounded alternation; terms ending in a non-letter (like "review:") match as-is. */
function rx(terms: string[]): RegExp {
  const key = terms.join("|");
  let r = cache.get(key);
  if (!r) {
    r = new RegExp(`(?<![a-z0-9])(?:${[...terms].sort((a, b) => b.length - a.length).map(esc).join("|")})(?![a-z0-9])`, "gi");
    cache.set(key, r);
  }
  return r;
}
const hits = (text: string, terms: string[]) => [...new Set([...text.matchAll(rx(terms))].map((m) => m[0].toLowerCase()))];

export interface GateResult {
  pass: boolean;
  /** why it passed or failed, in plain words (shown to reviewers). */
  reasons: string[];
  intent: string[];
  india: { cities: string[]; venues: string[]; states: string[] };
  foreign: string[];
  /** cancellation / postponement / venue or date change. Never dropped, always high priority. */
  change: string[];
  negative: string[];
  cardOffers: string[];
  earlyBirdMentioned: boolean;
  priority: "high" | "normal";
}

export interface GateOptions {
  venues?: Venue[];
  /** names of artists the owner watches (raises priority only; never required to pass). */
  watchlist?: string[];
}

/**
 * STEP 1 of detection: does the content (a) announce/tease/give sale details for a live event AND
 * (b) place it in India? Credibility is NOT judged here. Returns the evidence for the decision.
 */
export function relevanceGate(text: string, opts: GateOptions = {}): GateResult {
  const t = text.replace(/\s+/g, " ");
  const lower = t.toLowerCase();
  const venues = opts.venues ?? SEED_VENUES;

  const intent = [...new Set([...hits(t, ANNOUNCEMENT.terms), ...hits(t, TICKET_SALE.terms), ...hits(t, SOFT_LAUNCH.terms)])];
  const eventType = hits(t, EVENT_TYPES.terms);
  const change = hits(t, CHANGES.terms);
  const negative = hits(t, NEGATIVE.terms);
  const cardOffers = hits(t, CARD_BANK.terms);
  const cities = hits(t, INDIA_CITY_TERMS);
  const states = hits(t, INDIA_STATES);
  const foreign = hits(t, FOREIGN_PLACES);

  // venue names count only when unambiguous, or when the venue's city is also named
  const venueHits: string[] = [];
  for (const v of venues) {
    if (!rx([v.name]).test(t)) continue;
    rx([v.name]).lastIndex = 0;
    const cityNamed = v.city ? cities.includes(v.city.toLowerCase()) || lower.includes(v.city.toLowerCase()) : cities.length > 0;
    if (v.unambiguous || cityNamed) venueHits.push(v.name);
  }

  const indiaMatch = cities.length > 0 || venueHits.length > 0 || states.length > 0;
  const onlyForeign = foreign.length > 0 && !indiaMatch;
  const hasIntent = intent.length > 0 || (eventType.length > 0 && cardOffers.length > 0);
  const earlyBirdMentioned = /early[\s-]?bird/i.test(t);
  const reasons: string[] = [];
  let pass = true;

  if (change.length > 0 && indiaMatch) {
    // changes are kept even when other words would drop the item
    reasons.push(`change signal (${change.slice(0, 3).join(", ")}) with an India location: kept, high priority`);
  } else if (!hasIntent) {
    pass = false;
    reasons.push("no announcement, ticket-sale or teaser wording");
  } else if (!indiaMatch) {
    pass = false;
    reasons.push(onlyForeign ? `location is outside India (${foreign.slice(0, 2).join(", ")})` : "no India city, state or venue named");
  } else if (negative.length > 0) {
    pass = false;
    reasons.push(`not an announcement (${negative.slice(0, 2).join(", ")})`);
  } else {
    reasons.push(`intent: ${intent.slice(0, 3).join(", ")}`);
    reasons.push(`India: ${[...cities, ...venueHits, ...states].slice(0, 3).join(", ")}`);
  }

  const watch = (opts.watchlist ?? []).some((a) => a && lower.includes(a.toLowerCase()));
  if (pass && watch) reasons.push("artist on the watchlist (priority raised)");
  return {
    pass,
    reasons,
    intent,
    india: { cities, venues: venueHits, states },
    foreign,
    change,
    negative,
    cardOffers,
    earlyBirdMentioned,
    priority: pass && (change.length > 0 || watch) ? "high" : "normal",
  };
}
