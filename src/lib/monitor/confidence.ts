import type { SupabaseClient } from "@supabase/supabase-js";
import { classify, type SourceEvidence } from "./label.ts";
import { tierFor } from "./tiers.ts";

/**
 * Recomputes an event's CONFIRMED / LIKELY / UNVERIFIED label from ALL its stored sources.
 * Rules (see docs/DETECTION_RULES.md):
 *  - a human-verified event (or official API record) is CONFIRMED
 *  - a source read directly from structured data (schema.org JSON-LD) keeps its tier
 *  - a source read by AI from text (search or text extraction) counts as at most tier 2, so one AI-read page can
 *    make an event LIKELY but not CONFIRMED on its own
 *  - two independent credible domains agree => CONFIRMED (unless the sources conflict)
 */
export async function recomputeConfidence(db: SupabaseClient, eventId: string): Promise<{ label: string; bestTier: number }> {
  const { data: ev } = await db.from("events").select("id, verification_status, has_conflict, confidence_label, change_flag").eq("id", eventId).single();
  if (!ev) return { label: "unverified", bestTier: 99 };
  const { data: srcs } = await db.from("event_sources").select("source_url, source_title, discovery_source, external_id").eq("event_id", eventId);

  const evidence: SourceEvidence[] = (srcs ?? []).map((s) => {
    const t = tierFor(s.source_url as string);
    const structured = s.external_id === "jsonld" || s.discovery_source === "ticketmaster";
    const tier = t.tier === 0 ? 0 : structured ? t.tier : Math.max(t.tier, 2);
    return { name: t.name, domain: t.domain, tier, url: s.source_url as string };
  });
  const c = classify(evidence);
  let label = c.label as string;
  let confirmedBy = c.confirmedBy;
  if (ev.verification_status === "verified") {
    label = "confirmed";
    confirmedBy = confirmedBy ?? "reviewed with evidence";
  }
  // two credible sources that disagree about the facts cannot confirm each other
  if (ev.has_conflict && label === "confirmed" && ev.verification_status !== "verified" && evidence.filter((e) => e.tier === 1 && true).length === 0) label = "likely";

  const patch: Record<string, unknown> = { confidence_label: label, best_source_tier: c.bestTier === 99 ? null : c.bestTier, confirmed_by: label === "confirmed" ? confirmedBy : null };
  if (patch.confidence_label !== ev.confidence_label || label === "confirmed") await db.from("events").update(patch).eq("id", eventId);
  return { label, bestTier: c.bestTier };
}
