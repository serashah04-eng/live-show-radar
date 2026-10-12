import type { SupabaseClient } from "@supabase/supabase-js";
import { recomputeCorroboration } from "./corroboration-core.ts";
import { matchArtistsDeterministic } from "./match.ts";
import { persistDiscovery } from "./persist.ts";
import { createGeminiGroundingAdapter } from "./sources/gemini-grounding.ts";
import type { ArtistRecord } from "./types.ts";

/**
 * Independent second look: runs a targeted grounded search for one pending event and merges
 * whatever it finds (new sources on the same event are kept), then recomputes corroboration.
 */
export async function corroborateEvent(
  db: SupabaseClient,
  eventId: string,
  artists: ArtistRecord[],
  opts: { apiKey: string; model?: string },
): Promise<{ eventId: string; corroborated: boolean; sources: number }> {
  const { data: ev } = await db
    .from("events")
    .select("id, title, city, date_text, starts_at, event_artists(artist_id)")
    .eq("id", eventId)
    .single();
  if (!ev) throw new Error("event not found");
  const artist = artists.find((a) => a.id === ev.event_artists?.[0]?.artist_id);
  if (!artist) throw new Error("event has no known artist");

  const when = ev.starts_at ? new Date(ev.starts_at).toISOString().slice(0, 10) : ev.date_text ?? "";
  const adapter = createGeminiGroundingAdapter({
    apiKey: opts.apiKey,
    model: opts.model,
    focus: `${artist.name} ${ev.city ?? ""} ${when} tickets ${ev.title}`,
  });
  const found = await adapter.discover({ artists: [artist], today: new Date() });
  for (const raw of found) {
    await persistDiscovery(db, raw, matchArtistsDeterministic(raw, [artist]), [artist]);
  }
  const corroborated = await recomputeCorroboration(db, eventId);
  const { count } = await db.from("event_sources").select("*", { count: "exact", head: true }).eq("event_id", eventId);
  return { eventId, corroborated, sources: count ?? 0 };
}
