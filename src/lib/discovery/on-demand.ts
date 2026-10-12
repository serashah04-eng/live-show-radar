import type { SupabaseClient } from "@supabase/supabase-js";
import { runAdapter } from "./run.ts";
import { createGeminiGroundingAdapter } from "./sources/gemini-grounding.ts";
import { createTicketmasterAdapter } from "./sources/ticketmaster.ts";
import type { ArtistRecord } from "./types.ts";

export const SEARCH_COOLDOWN_MIN = 15; // the same artist is not searched again within this window
export const STALE_AFTER_HOURS = 24; // a followed artist counts as "needs a search" after this long

export interface OnDemandResult {
  artist: string;
  status: "searched" | "skipped_recent" | "no_sources" | "failed";
  found: number;
  created: number;
  error: string | null;
}

export interface OnDemandOptions {
  geminiApiKey: string;
  geminiModel?: string;
  ticketmasterKey?: string;
  cities?: string[]; // the user's priority cities, used to steer the search
  force?: boolean; // ignore the cooldown
  /** "past" = history search: does not touch the artist's search schedule and skips Ticketmaster (upcoming only). */
  mode?: "upcoming" | "past";
  sinceDate?: string;
  budgetMs?: number;
}

/**
 * Searches ONE artist right now (used when someone picks an artist). The artist is claimed atomically
 * (compare-and-set on last_searched_at) so taps from several people never run the same search twice,
 * and a search that returns no grounded sources gives the claim back so it is retried soon.
 */
export async function searchArtistNow(db: SupabaseClient, artistId: string, o: OnDemandOptions): Promise<OnDemandResult> {
  const { data: row } = await db
    .from("artists")
    .select("id, name, normalized_name, last_searched_at, artist_aliases(normalized_alias)")
    .eq("id", artistId)
    .maybeSingle();
  if (!row) return { artist: "unknown", status: "failed", found: 0, created: 0, error: "artist not found" };
  const prev = (row.last_searched_at as string | null) ?? null;
  const name = row.name as string;

  if (o.mode === "past") {
    const rec: ArtistRecord = { id: artistId, name, normalizedName: row.normalized_name as string, aliases: (row.artist_aliases as { normalized_alias: string }[]).map((a) => a.normalized_alias) };
    let ok = false;
    const r = await runAdapter(
      db,
      createGeminiGroundingAdapter({ apiKey: o.geminiApiKey, model: o.geminiModel, mode: "past", sinceDate: o.sinceDate, deadlineMs: Date.now() + (o.budgetMs ?? 170_000), onArtistDone: () => { ok = true; } }),
      { artists: [rec], today: new Date() },
      { geminiApiKey: o.geminiApiKey, geminiModel: o.geminiModel },
    );
    return { artist: name, status: ok ? "searched" : r.status === "failed" ? "failed" : "no_sources", found: r.found, created: r.created, error: r.error };
  }

  if (!o.force && prev && Date.now() - Date.parse(prev) < SEARCH_COOLDOWN_MIN * 60_000) {
    return { artist: name, status: "skipped_recent", found: 0, created: 0, error: null };
  }
  const claimedAt = new Date().toISOString();
  const q = db.from("artists").update({ last_searched_at: claimedAt }).eq("id", artistId);
  const { data: won } = await (prev === null ? q.is("last_searched_at", null) : q.eq("last_searched_at", prev)).select("id");
  if (!won?.length) return { artist: name, status: "skipped_recent", found: 0, created: 0, error: null };

  const record: ArtistRecord = {
    id: artistId,
    name,
    normalizedName: row.normalized_name as string,
    aliases: (row.artist_aliases as { normalized_alias: string }[]).map((a) => a.normalized_alias),
  };
  const ctx = { artists: [record], today: new Date() };
  let grounded = false;
  const gemini = await runAdapter(
    db,
    createGeminiGroundingAdapter({
      apiKey: o.geminiApiKey,
      model: o.geminiModel,
      cities: o.cities,
      deadlineMs: Date.now() + (o.budgetMs ?? 170_000),
      onArtistDone: () => {
        grounded = true;
      },
    }),
    ctx,
    { geminiApiKey: o.geminiApiKey, geminiModel: o.geminiModel },
  );
  let found = gemini.found;
  let created = gemini.created;
  let error = gemini.error;
  if (o.ticketmasterKey) {
    const tm = await runAdapter(db, createTicketmasterAdapter({ apiKey: o.ticketmasterKey }), ctx, { geminiApiKey: o.geminiApiKey, geminiModel: o.geminiModel });
    found += tm.found;
    created += tm.created;
    error = error ?? tm.error;
  }

  if (!grounded) {
    // give the claim back: the search never reached real sources
    await db.from("artists").update({ last_searched_at: prev }).eq("id", artistId).eq("last_searched_at", claimedAt);
    return { artist: name, status: gemini.status === "failed" ? "failed" : "no_sources", found, created, error };
  }
  return { artist: name, status: "searched", found, created, error };
}
