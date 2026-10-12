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
}

export interface FeedItem {
  event: FeedEvent;
  reasons: string[];
  priorityCity: boolean;
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
    const genreMatch = prefs.allGenres || genreHits.size > 0;
    const eligible = prefs.strictGenreMode ? genreMatch : followed.length > 0 || genreMatch;
    if (!eligible) continue;

    // ---- city: priority, never exclusive unless the user turned other cities off ----
    const cityKey = lc(e.city);
    const priorityCity = cityKey !== "" && prefCities.includes(cityKey);
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
    if (prefs.allGenres) reasons.push("All genres selected");
    else for (const g of genreHits) reasons.push(`Genre: ${g}`);
    if (priorityCity) reasons.push(`In your city: ${e.city}`);
    else if (e.city) reasons.push(`Other city: ${e.city}`);
    const dl = earliestVerifiedDeadline(e);
    const deadline = dl !== null && dl > now.getTime() ? dl : null;
    out.push({ event: e, reasons, priorityCity, deadline, urgent: deadline !== null && deadline - now.getTime() < 72 * 3600 * 1000 });
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
    if (sort === "relevance" && a.priorityCity !== b.priorityCity) return a.priorityCity ? -1 : 1;
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
  if (prefs.followedArtistIds.length < 5) hints.push("Follow more artists in Artist Manager.");
  hints.push("Add a concert you found yourself with Add event by link.");
  return hints;
}
