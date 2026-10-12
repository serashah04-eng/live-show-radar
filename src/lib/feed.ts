// Pure feed logic: saved preferences + temporary filters -> visible events with reasons.
// No I/O here so it can be unit tested.

export interface FeedArtist {
  id: string;
  name: string;
  genreSlugs: string[];
}
export interface FeedPhase {
  phase: string;
  ends_at: string | null;
  verification_status: "unverified" | "verified";
}
export interface FeedEvent {
  id: string;
  title: string;
  starts_at: string | null;
  date_text: string | null;
  date_precision: string;
  venue: string | null;
  city: string | null;
  ticket_url: string | null;
  ticket_status: string;
  verification_status: "pending_verification" | "verified" | "rejected" | "cancelled" | "stale";
  corroborated: boolean;
  has_conflict: boolean;
  is_sample: boolean;
  last_checked_at: string | null;
  discovered_at: string;
  artists: FeedArtist[];
  sources: { url: string; title: string | null }[];
  phases: FeedPhase[];
}

/** Saved preferences (persisted in Supabase). Never changed by temporary filters. */
export interface Prefs {
  allGenres: boolean;
  strictGenreMode: boolean;
  genreSlugs: string[];
  cities: string[]; // priority cities, Bengaluru by default
  showOtherCities: boolean;
  followedArtistIds: string[];
}

/** Temporary filters (URL query). Resetting these never touches Prefs. */
export interface Filters {
  artistId?: string;
  genre?: string;
  city?: string;
  from?: string; // YYYY-MM-DD
  to?: string;
  status?: "all" | "verified" | "corroborated" | "pending";
  ticketStatus?: string;
  sort?: "relevance" | "date" | "discovered" | "deadline";
  /**
   * Which shows qualify. "mine" = only artists you follow (the default once you follow anyone),
   * "genres" = followed artists plus your saved genres, "all" = everything (discovery).
   */
  scope?: "mine" | "genres" | "all";
  /** Old name for scope "all". */
  discover?: boolean;
}

export type FeedScope = NonNullable<Filters["scope"]>;

/** The scope used when none is chosen: follow artists and the feed follows them; follow nobody and genres decide. */
export function defaultScope(prefs: Prefs): FeedScope {
  return prefs.followedArtistIds.length > 0 ? "mine" : "genres";
}

export interface FeedItem {
  event: FeedEvent;
  reasons: string[];
  priorityCity: boolean;
  /** Position in the user's ordered city list (0 = top priority). 999 = not a priority city. */
  cityRank: number;
  /** Earliest VERIFIED early-bird/phase end still in the future (ms), else null. */
  deadline: number | null;
  /** True only for a verified deadline within 72 hours. */
  urgent: boolean;
}

const lc = (s: string | null | undefined) => (s ?? "").trim().toLowerCase();

export function earliestVerifiedDeadline(e: FeedEvent): number | null {
  const ends = e.phases
    .filter((p) => p.verification_status === "verified" && p.ends_at)
    .map((p) => new Date(p.ends_at as string).getTime());
  return ends.length ? Math.min(...ends) : null;
}

export function buildFeed(events: FeedEvent[], prefs: Prefs, filters: Filters, now = new Date()): FeedItem[] {
  const out: FeedItem[] = [];
  const statusFilter = filters.status ?? "all";
  const prefCities = prefs.cities.map(lc);

  for (const e of events) {
    if (e.verification_status === "rejected") continue;
    if (e.starts_at && new Date(e.starts_at).getTime() < now.getTime() - 24 * 3600 * 1000) continue;
    if (statusFilter === "all" && (e.verification_status === "cancelled" || e.verification_status === "stale")) {
      // hidden by default; still stored and visible on the event page
      continue;
    }

    // ---- saved preference matching (OR logic across followed artists and genres) ----
    const followed = e.artists.filter((a) => prefs.followedArtistIds.includes(a.id));
    const genreHits = new Set<string>();
    for (const a of e.artists) for (const g of a.genreSlugs) if (prefs.genreSlugs.includes(g)) genreHits.add(g);
    // "All genres" only broadens the feed while the user follows nobody yet. Once they pick artists,
    // the feed follows those picks, so it visibly changes every time they follow or unfollow someone.
    const hasFollows = prefs.followedArtistIds.length > 0;
    const genreMatchLoose = (prefs.allGenres && !hasFollows) || genreHits.size > 0;
    const genreMatchStrict = prefs.allGenres || genreHits.size > 0;
    const scope: FeedScope = filters.scope ?? (filters.discover ? "all" : defaultScope(prefs));
    const eligible =
      scope === "all" ||
      (prefs.strictGenreMode ? genreMatchStrict : scope === "mine" ? followed.length > 0 : followed.length > 0 || genreMatchLoose);
    if (!eligible) continue;

    // ---- city: priority, never exclusive unless the user turned other cities off ----
    const cityKey = lc(e.city);
    const rankIdx = cityKey === "" ? -1 : prefCities.indexOf(cityKey);
    const priorityCity = rankIdx >= 0;
    const cityRank = rankIdx >= 0 ? rankIdx : 999;
    if (!prefs.showOtherCities && cityKey !== "" && !priorityCity) continue;

    // ---- temporary filters ----
    if (filters.artistId && !e.artists.some((a) => a.id === filters.artistId)) continue;
    if (filters.genre && !e.artists.some((a) => a.genreSlugs.includes(filters.genre as string))) continue;
    if (filters.city && cityKey !== lc(filters.city)) continue;
    if (filters.from && e.starts_at && e.starts_at.slice(0, 10) < filters.from) continue;
    if (filters.to && e.starts_at && e.starts_at.slice(0, 10) > filters.to) continue;
    if ((filters.from || filters.to) && !e.starts_at) continue; // unknown date can't satisfy a date filter
    if (filters.ticketStatus && e.ticket_status !== filters.ticketStatus) continue;
    if (statusFilter === "verified" && e.verification_status !== "verified") continue;
    if (statusFilter === "corroborated" && !(e.corroborated && e.verification_status === "pending_verification")) continue;
    if (statusFilter === "pending" && !(e.verification_status === "pending_verification" && !e.corroborated)) continue;

    const reasons: string[] = [];
    for (const a of followed) reasons.push(`You follow ${a.name}`);
    if (followed.length === 0 && scope === "all") reasons.push("Discover: not one of your artists");
    if (prefs.allGenres && !hasFollows) reasons.push("All genres selected");
    else for (const g of genreHits) reasons.push(`Genre: ${g}`);
    if (priorityCity) reasons.push(cityRank === 0 ? `Your top city: ${e.city}` : `Your city #${cityRank + 1}: ${e.city}`);
    else if (e.city) reasons.push(`Other city: ${e.city}`);
    const dl = earliestVerifiedDeadline(e);
    const deadline = dl !== null && dl > now.getTime() ? dl : null;
    out.push({ event: e, reasons, priorityCity, cityRank, deadline, urgent: deadline !== null && deadline - now.getTime() < 72 * 3600 * 1000 });
  }

  const sort = filters.sort ?? "relevance";
  const t = (e: FeedEvent) => (e.starts_at ? new Date(e.starts_at).getTime() : Number.MAX_SAFE_INTEGER);
  out.sort((a, b) => {
    if (sort === "discovered") return +new Date(b.event.discovered_at) - +new Date(a.event.discovered_at);
    if (sort === "deadline") {
      const da = earliestVerifiedDeadline(a.event) ?? Number.MAX_SAFE_INTEGER;
      const db = earliestVerifiedDeadline(b.event) ?? Number.MAX_SAFE_INTEGER;
      return da - db || t(a.event) - t(b.event);
    }
    if (sort === "relevance" && a.cityRank !== b.cityRank) return a.cityRank - b.cityRank; // your #1 city first, then #2, ...
    return t(a.event) - t(b.event);
  });
  return out;
}

/** Suggestions for the honest empty state: what could be broadened. */
export function emptyStateHints(prefs: Prefs, filters: Filters): string[] {
  const hints: string[] = [];
  if (Object.values(filters).some((v) => v && v !== "relevance")) hints.push("Clear the active filters (your saved preferences stay untouched).");
  if (!prefs.allGenres) hints.push("Add more genres, or switch to All genres in Settings.");
  if (prefs.strictGenreMode) hints.push("Turn off strict genre mode so followed artists always appear.");
  if (!prefs.showOtherCities) hints.push("Turn on other Indian cities in Settings.");
  if (prefs.followedArtistIds.length < 5) hints.push("Follow more artists in Artists, then tap Find shows.");
  if ((filters.scope ?? (filters.discover ? "all" : defaultScope(prefs))) !== "all") hints.push("Switch the view to Everything to also see shows by artists you do not follow.");
  hints.push("Add a concert you found yourself with Add event by link.");
  return hints;
}

const BOOKING_HOSTS = ["bookmyshow", "district.in", "skillbox", "insider.in", "ticketmaster", "paytm", "eventbrite", "townscript", "ticketgenie", "thumpn", "livefiesta", "bandsintown"];
const hostOf = (u: string) => {
  try {
    return new URL(u).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return "";
  }
};

export interface BookingLink {
  url: string;
  host: string;
  /** "ticket" = a ticket link stored for the event. "listing" = a page that lists the event (may link to tickets). */
  kind: "ticket" | "listing";
}

/**
 * Where "Book show" should send the user. Never invents a link: it is the stored ticket URL, else the best
 * source page (ticketing sites first, social posts last).
 */
export function bookingLink(e: Pick<FeedEvent, "ticket_url" | "sources">): BookingLink | null {
  if (e.ticket_url && hostOf(e.ticket_url)) return { url: e.ticket_url, host: hostOf(e.ticket_url), kind: "ticket" };
  const ranked = e.sources
    .map((s) => ({ url: s.url, host: hostOf(s.url) }))
    .filter((s) => s.host)
    .sort((a, b) => score(a.host) - score(b.host));
  const best = ranked[0];
  return best ? { url: best.url, host: best.host, kind: "listing" } : null;
}
const score = (host: string) => {
  if (BOOKING_HOSTS.some((h) => host.includes(h))) return 0;
  if (/instagram|facebook|twitter|x\.com|youtube/.test(host)) return 2;
  return 1;
};