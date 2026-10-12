import type { SupabaseClient } from "@supabase/supabase-js";
import { recomputeConfidence } from "../monitor/confidence.ts";
import { recomputeCorroboration } from "./corroboration-core.ts";
import { dedupeKey, normalizeName, venuesDisagree } from "./normalize.ts";
import type { ArtistMatch } from "./match.ts";
import type { ArtistRecord, RawDiscovery } from "./types.ts";

export interface PersistResult {
  action: "created" | "merged" | "skipped_unmatched";
  eventId?: string;
  conflict?: boolean;
}

const sameText = (a: string | null, b: string | null) => normalizeName(a ?? "") === normalizeName(b ?? "");

/**
 * Stores one discovery. Rules:
 *  - events matching no followed artist are skipped (never stored)
 *  - AI-reported / search-derived events always start as pending_verification
 *  - only structured records from a permitted official API start as verified (event details only;
 *    ticket phases and deadlines are never inferred)
 *  - duplicates (same artist + city + date bucket) are merged and every source link is kept
 *  - disagreement between sources sets has_conflict instead of overwriting
 */
export async function persistDiscovery(
  db: SupabaseClient,
  raw: RawDiscovery,
  matches: ArtistMatch[],
  artists: ArtistRecord[],
): Promise<PersistResult> {
  if (matches.length === 0) return { action: "skipped_unmatched" };
  const primary = artists.find((a) => a.id === matches[0].artistId)!;
  const key = dedupeKey(primary.name, raw.city, raw.dateBucket);
  const now = new Date().toISOString();

  // 1. find an existing event: exact key, else same artist+date bucket where city is unknown on either side
  let { data: existing } = await db.from("events").select("*").eq("dedupe_key", key).maybeSingle();
  if (!existing) {
    const prefix = normalizeName(primary.name) + "|";
    const { data: cands } = await db.from("events").select("*").like("dedupe_key", `${prefix}%|${raw.dateBucket}`);
    existing =
      (cands ?? []).find((c) => !raw.city || !c.city || sameText(c.city, raw.city)) ?? null;
  }

  let eventId: string;
  let created = false;
  let conflict = false;

  if (existing) {
    eventId = existing.id;
    const patch: Record<string, unknown> = { last_checked_at: now };
    if (!existing.venue && raw.venue) patch.venue = raw.venue;
    if (!existing.city && raw.city) patch.city = raw.city;
    if (!existing.ticket_url && raw.ticketUrl) patch.ticket_url = raw.ticketUrl;
    if (venuesDisagree(existing.venue, raw.venue)) conflict = true;
    if (existing.starts_at && raw.startsAt && existing.date_precision === "exact" && raw.datePrecision === "exact"
      && new Date(existing.starts_at).getTime() !== new Date(raw.startsAt).getTime()) conflict = true;
    if (conflict) patch.has_conflict = true;
    await db.from("events").update(patch).eq("id", eventId);
  } else {
    const verified = raw.officialApiRecord;
    const { data: ins, error } = await db
      .from("events")
      .insert({
        title: raw.title,
        starts_at: raw.startsAt,
        date_text: raw.dateText,
        date_precision: raw.datePrecision,
        venue: raw.venue,
        city: raw.city,
        ticket_url: raw.ticketUrl,
        ticket_status: raw.ticketUrl ? "tickets_available" : "unknown",
        verification_status: verified ? "verified" : "pending_verification",
        verified_at: verified ? now : null,
        dedupe_key: key,
        last_checked_at: now,
        first_announced_at: now,
      })
      .select("id")
      .single();
    if (error) throw new Error(`insert event failed: ${error.message}`);
    eventId = ins.id;
    created = true;
  }

  // 2. keep every source link
  const { data: src, error: srcErr } = await db
    .from("event_sources")
    .upsert(
      {
        event_id: eventId,
        discovery_source: raw.discoverySource,
        source_url: raw.sourceUrl,
        source_title: raw.sourceTitle,
        external_id: raw.externalId,
        last_checked_at: now,
      },
      { onConflict: "event_id,source_url" },
    )
    .select("id")
    .single();
  if (srcErr) throw new Error(`upsert source failed: ${srcErr.message}`);

  // 3. artist links
  for (const m of matches) {
    await db.from("event_artists").upsert(
      { event_id: eventId, artist_id: m.artistId, match_method: m.method, confidence: m.confidence, matched_text: m.matchedText },
      { onConflict: "event_id,artist_id" },
    );
  }

  // 4. evidence trail (labels make clear whether a model or an API produced the claim)
  if (created || conflict) {
    const label = raw.aiReported ? "[AI-reported via Google Search, unverified] " : raw.officialApiRecord ? "[Official API record] " : "[User-submitted] ";
    await db.from("event_evidence").insert({
      event_id: eventId,
      source_id: src.id,
      kind: "event_details",
      evidence_url: raw.sourceUrl,
      excerpt: raw.excerpt ? label + raw.excerpt.slice(0, 500) : label.trim(),
    });
  }

  await recomputeCorroboration(db, eventId);
  await recomputeConfidence(db, eventId);
  return { action: created ? "created" : "merged", eventId, conflict };
}
