import type { SupabaseClient } from "@supabase/supabase-js";
import { runDispatch, type DispatchStats } from "../notify/dispatch.ts";
import { corroborateEvent } from "./corroborate.ts";
import { loadArtists, runAdapter } from "./run.ts";
import { createGeminiGroundingAdapter } from "./sources/gemini-grounding.ts";
import { createTicketmasterAdapter } from "./sources/ticketmaster.ts";

export interface CycleOptions {
  artistsPerRun: number; // how many artists to search this run (oldest-searched first)
  corroborateMax: number; // targeted second searches for pending events
  budgetMs: number; // stop starting new work after this long (hosting time limit)
  geminiApiKey: string;
  geminiModel?: string;
  ticketmasterKey?: string;
  sendAlerts: boolean;
}

export interface CycleSummary {
  artistsSearched: string[];
  gemini: { status: string; found: number; created: number; error: string | null } | null;
  ticketmaster: { status: string; found: number; created: number; error: string | null } | null;
  corroborated: { checked: number; nowCorroborated: number };
  alerts: Omit<DispatchStats, "disabled"> | { skipped: true };
  elapsedMs: number;
}

/**
 * One scheduled cycle: search the next few artists, second-look at pending events,
 * then send alerts. Everything is deduplicated, so overlapping or repeated runs are safe.
 */
export async function runDiscoveryCycle(db: SupabaseClient, o: CycleOptions): Promise<CycleSummary> {
  const started = Date.now();
  const deadline = started + o.budgetMs;
  const all = await loadArtists(db);
  const { data: rotation } = await db.from("artists").select("id, last_searched_at");
  const lastSeen = new Map((rotation ?? []).map((r) => [r.id as string, r.last_searched_at as string | null]));
  // Only artists somebody follows are worth the search quota; the rest of the catalogue waits until picked.
  const { data: followRows } = await db.from("user_artist_follows").select("artist_id");
  const followedIds = new Set((followRows ?? []).map((r) => r.artist_id as string));
  // never-searched first, then oldest
  const ranked = [...all].filter((a) => followedIds.has(a.id)).sort(
    (a, b) => (lastSeen.get(a.id) ? Date.parse(lastSeen.get(a.id)!) : 0) - (lastSeen.get(b.id) ? Date.parse(lastSeen.get(b.id)!) : 0),
  );

  // Claim artists atomically (compare-and-set on last_searched_at) so parallel runs never search the same artist.
  const next: typeof all = [];
  const claimedAt = new Date().toISOString();
  for (const a of ranked) {
    if (next.length >= Math.max(1, o.artistsPerRun)) break;
    const prev = lastSeen.get(a.id) ?? null;
    const q = db.from("artists").update({ last_searched_at: claimedAt }).eq("id", a.id);
    const { data: won } = await (prev === null ? q.is("last_searched_at", null) : q.eq("last_searched_at", prev)).select("id");
    if (won?.length) next.push(a);
  }
  const ctx = { artists: next, today: new Date() };

  const searched: string[] = [];
  const gemini = await runAdapter(
    db,
    createGeminiGroundingAdapter({
      apiKey: o.geminiApiKey,
      model: o.geminiModel,
      delayMs: 2000,
      deadlineMs: deadline - 60_000, // keep a minute for the rest of the cycle
      onArtistDone: (id) => searched.push(id),
    }),
    ctx,
    { geminiApiKey: o.geminiApiKey, geminiModel: o.geminiModel },
  );
  // Artists whose search did not complete (timeout or no grounded sources) go back to their old position
  // so they are retried soon instead of waiting for a full rotation.
  for (const a of next.filter((x) => !searched.includes(x.id))) {
    await db.from("artists").update({ last_searched_at: lastSeen.get(a.id) ?? null }).eq("id", a.id).eq("last_searched_at", claimedAt);
  }

  const tm = o.ticketmasterKey
    ? await runAdapter(db, createTicketmasterAdapter({ apiKey: o.ticketmasterKey, delayMs: 250 }), ctx, { geminiApiKey: o.geminiApiKey, geminiModel: o.geminiModel })
    : null;

  // targeted second search for pending, not-yet-corroborated events (least recently checked first)
  let checked = 0;
  let nowCorroborated = 0;
  if (Date.now() < deadline - 45_000) {
    const { data: pending } = await db
      .from("events")
      .select("id")
      .eq("verification_status", "pending_verification")
      .eq("corroborated", false)
      .eq("has_conflict", false)
      .order("last_checked_at", { ascending: true, nullsFirst: true })
      .limit(o.corroborateMax);
    for (const e of pending ?? []) {
      if (Date.now() > deadline - 30_000) break;
      try {
        const r = await corroborateEvent(db, e.id, all, { apiKey: o.geminiApiKey, model: o.geminiModel });
        checked++;
        if (r.corroborated) nowCorroborated++;
      } catch {
        /* one failed second look must not stop the cycle; the run log already records adapter errors */
      }
    }
  }

  let alerts: CycleSummary["alerts"] = { skipped: true };
  if (o.sendAlerts) {
    const { plan, ...stats } = await runDispatch(db);
    void plan;
    alerts = stats;
  }
  return {
    artistsSearched: next.filter((a) => searched.includes(a.id)).map((a) => a.name),
    gemini: { status: gemini.status, found: gemini.found, created: gemini.created, error: gemini.error },
    ticketmaster: tm ? { status: tm.status, found: tm.found, created: tm.created, error: tm.error } : null,
    corroborated: { checked, nowCorroborated },
    alerts,
    elapsedMs: Date.now() - started,
  };
}
