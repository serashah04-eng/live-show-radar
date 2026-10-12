import type { SupabaseClient } from "@supabase/supabase-js";

const TWO_PART_TLDS = new Set(["co.in", "co.uk", "com.au", "org.in", "net.in", "ac.in"]);

/** Approximate registrable domain: "in.bookmyshow.com" -> "bookmyshow.com". */
export function registrableDomain(urlOrHost: string): string {
  let host = urlOrHost;
  try {
    host = new URL(urlOrHost).hostname;
  } catch {
    /* already a host */
  }
  const parts = host.toLowerCase().replace(/^www\./, "").split(".");
  if (parts.length <= 2) return parts.join(".");
  const last2 = parts.slice(-2).join(".");
  return TWO_PART_TLDS.has(last2) ? parts.slice(-3).join(".") : last2;
}

export function countIndependentDomains(urls: string[]): number {
  return new Set(urls.map(registrableDomain)).size;
}

/**
 * Corroborated = at least two independent websites report the same event (same artist+city+date
 * bucket, as merged by deduplication) and the sources do not conflict. This is NOT verification.
 */
export async function recomputeCorroboration(db: SupabaseClient, eventId: string): Promise<boolean> {
  const { data: ev } = await db
    .from("events")
    .select("id, has_conflict, verification_status, corroborated")
    .eq("id", eventId)
    .single();
  if (!ev) return false;
  const { data: srcs } = await db.from("event_sources").select("source_url").eq("event_id", eventId);
  const independent = countIndependentDomains((srcs ?? []).map((s) => s.source_url));
  const should = independent >= 2 && !ev.has_conflict && ev.verification_status === "pending_verification";
  if (should && !ev.corroborated) {
    await db.from("events").update({ corroborated: true, corroborated_at: new Date().toISOString() }).eq("id", eventId);
  } else if (!should && ev.corroborated && ev.verification_status === "pending_verification") {
    await db.from("events").update({ corroborated: false, corroborated_at: null }).eq("id", eventId);
  }
  return should;
}
