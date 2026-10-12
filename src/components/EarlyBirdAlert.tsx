import { getCurrentUser } from "@/lib/auth";
import { loadFeedEvents, loadPrefs } from "@/lib/data";
import { buildFeed } from "@/lib/feed";
import { formatDateTime } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { EarlyBirdDialog, type EarlyBirdItem } from "./EarlyBirdDialog";

/** Server side: finds verified, evidence-backed early-bird phases the user hasn't been shown yet. */
export async function EarlyBirdAlert() {
  const user = await getCurrentUser();
  if (!user) return null;
  const sb = await createClient();
  const { prefs, notif } = await loadPrefs(sb, user.id);
  if (!notif.early_bird_alerts) return null; // the alert toggle is off; the verified data stays visible in the feed

  const [events, { data: phases }, { data: seen }] = await Promise.all([
    loadFeedEvents(sb),
    sb
      .from("ticket_phases")
      .select("id, event_id, ends_at, verified_at, event_evidence ( evidence_url, excerpt )")
      .eq("phase", "early_bird")
      .eq("verification_status", "verified")
      .gt("ends_at", new Date().toISOString())
      .order("ends_at", { ascending: true }),
    sb.from("alert_dismissals").select("phase_id").eq("user_id", user.id),
  ]);

  const dismissed = new Set((seen ?? []).map((s) => s.phase_id));
  const visible = new Map(buildFeed(events, prefs, {}).map((i) => [i.event.id, i.event]));
  const items: EarlyBirdItem[] = [];
  for (const p of phases ?? []) {
    const ev = visible.get(p.event_id);
    const evidence = p.event_evidence as unknown as { evidence_url: string; excerpt: string | null } | null;
    if (!ev || ev.verification_status !== "verified" || !evidence?.evidence_url || !p.ends_at || dismissed.has(p.id)) continue;
    items.push({
      phaseId: p.id,
      eventId: ev.id,
      artists: ev.artists.map((a) => a.name).join(" + ") || ev.title,
      city: ev.city,
      endsLabel: formatDateTime(p.ends_at),
      evidenceUrl: evidence.evidence_url,
      excerpt: evidence.excerpt,
    });
  }
  return items.length ? <EarlyBirdDialog items={items} /> : null;
}
