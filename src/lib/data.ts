import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { FeedEvent, Prefs } from "@/lib/feed";

export const GENRE_LABEL_FALLBACK = (slug: string) => slug.replace(/-/g, " ");

/** Loads events through the signed-in user's client, so RLS decides what is visible. */
export async function loadFeedEvents(sb: SupabaseClient): Promise<FeedEvent[]> {
  const { data, error } = await sb
    .from("events")
    .select(
      `id, title, starts_at, date_text, date_precision, venue, city, ticket_url, ticket_status,
       verification_status, corroborated, has_conflict, is_sample, last_checked_at, discovered_at,
       event_artists ( artists ( id, name, artist_genres ( genres ( slug ) ) ) ),
       event_sources ( source_url, source_title ),
       ticket_phases ( phase, ends_at, verification_status )`,
    )
    .order("starts_at", { ascending: true, nullsFirst: false });
  if (error) throw new Error(`Could not load events: ${error.message}`);

  type Row = Record<string, unknown> & {
    event_artists: { artists: { id: string; name: string; artist_genres: { genres: { slug: string } | null }[] } | null }[];
    event_sources: { source_url: string; source_title: string | null }[];
    ticket_phases: FeedEvent["phases"];
  };
  return (data as unknown as Row[]).map((r) => ({
    ...(r as unknown as FeedEvent),
    artists: r.event_artists
      .map((ea) => ea.artists)
      .filter((a): a is NonNullable<typeof a> => Boolean(a))
      .map((a) => ({
        id: a.id,
        name: a.name,
        genreSlugs: a.artist_genres.map((g) => g.genres?.slug).filter((s): s is string => Boolean(s)),
      })),
    sources: r.event_sources.map((s) => ({ url: s.source_url, title: s.source_title })),
    phases: r.ticket_phases,
  }));
}

export interface NotificationPrefs {
  telegram_enabled: boolean;
  telegram_chat_id: string | null;
  email_enabled: boolean;
  email_address: string | null;
  new_concert_alerts: boolean;
  early_bird_alerts: boolean;
  deadline_reminders: boolean;
}

export async function loadPrefs(sb: SupabaseClient, userId: string): Promise<{ prefs: Prefs; notif: NotificationPrefs }> {
  const [{ data: up }, { data: ug }, { data: follows }, { data: np }] = await Promise.all([
    sb.from("user_preferences").select("*").eq("user_id", userId).maybeSingle(),
    sb.from("user_genres").select("genres(slug)").eq("user_id", userId),
    sb.from("user_artist_follows").select("artist_id").eq("user_id", userId),
    sb.from("notification_preferences").select("*").eq("user_id", userId).maybeSingle(),
  ]);
  const prefs: Prefs = {
    allGenres: up?.all_genres ?? true,
    strictGenreMode: up?.strict_genre_mode ?? false,
    genreSlugs: ((ug ?? []) as unknown as { genres: { slug: string } | null }[]).map((g) => g.genres?.slug).filter((s): s is string => Boolean(s)),
    cities: up?.cities ?? ["Bengaluru"],
    showOtherCities: up?.show_other_indian_cities ?? true,
    followedArtistIds: (follows ?? []).map((f) => f.artist_id),
  };
  const notif: NotificationPrefs = {
    telegram_enabled: np?.telegram_enabled ?? true,
    telegram_chat_id: np?.telegram_chat_id ?? null,
    email_enabled: np?.email_enabled ?? true,
    email_address: np?.email_address ?? null,
    new_concert_alerts: np?.new_concert_alerts ?? true,
    early_bird_alerts: np?.early_bird_alerts ?? true,
    deadline_reminders: np?.deadline_reminders ?? true,
  };
  return { prefs, notif };
}

/** Followed artists that have never been searched, or not in the last 24 hours. */
export async function loadPendingSearches(sb: SupabaseClient, followedIds: string[]): Promise<{ id: string; name: string }[]> {
  if (followedIds.length === 0) return [];
  const { data } = await sb.from("artists").select("id, name, last_searched_at").in("id", followedIds).order("name");
  const cutoff = Date.now() - 24 * 3600 * 1000;
  return (data ?? [])
    .filter((a) => !a.last_searched_at || Date.parse(a.last_searched_at as string) < cutoff)
    .map((a) => ({ id: a.id as string, name: a.name as string }));
}

export async function loadGenres(sb: SupabaseClient) {
  const { data } = await sb.from("genres").select("id, slug, name").order("name");
  return data ?? [];
}

export async function loadRecentRuns(sb: SupabaseClient, limit = 8) {
  const { data } = await sb.from("discovery_runs").select("*").order("started_at", { ascending: false }).limit(limit);
  return data ?? [];
}
