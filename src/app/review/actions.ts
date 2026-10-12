"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { runDispatch } from "@/lib/notify/dispatch";
import { requireAdmin } from "@/lib/auth";
import { parseDateField } from "@/lib/discovery/normalize";
import { createServiceClient } from "@/lib/supabase/service";

export interface ReviewState {
  error?: string;
  ok?: string;
}

/** After a human verifies something, send the resulting alerts promptly (deduplicated, so safe to call repeatedly). */
function dispatchSoon() {
  if (process.env.AUTO_DISPATCH_ON_REVIEW === "false") return;
  after(async () => {
    try {
      await runDispatch(createServiceClient());
    } catch (e) {
      console.error("alert dispatch after review failed:", e instanceof Error ? e.message : e);
    }
  });
}

const text = (f: FormData, k: string) => String(f.get(k) ?? "").trim();
const uuid = (s: string) => /^[0-9a-f-]{36}$/i.test(s);
const httpUrl = (s: string) => {
  try {
    const u = new URL(s);
    return u.protocol === "https:" || u.protocol === "http:";
  } catch {
    return false;
  }
};

/** Owner confirms an event. Requires an evidence URL and the text on the page that supports it. */
export async function confirmEvent(_p: ReviewState, f: FormData): Promise<ReviewState> {
  const admin = await requireAdmin();
  const id = text(f, "eventId");
  const evidenceUrl = text(f, "evidenceUrl");
  const excerpt = text(f, "excerpt");
  if (!uuid(id)) return { error: "Invalid event." };
  if (!httpUrl(evidenceUrl)) return { error: "Enter the URL of the page that confirms this event." };
  if (excerpt.length < 8) return { error: "Quote the text on that page that confirms the artist, date and venue." };

  const db = createServiceClient();
  const now = new Date().toISOString();
  const ins = await db.from("event_evidence").insert({
    event_id: id, kind: "event_details", evidence_url: evidenceUrl, excerpt: `[Owner-reviewed] ${excerpt.slice(0, 500)}`, checked_by: admin.id, checked_at: now,
  });
  if (ins.error) return { error: "Could not store the evidence." };
  const { error } = await db
    .from("events")
    .update({ verification_status: "verified", verified_at: now, verified_by: admin.id, last_checked_at: now, corroborated: false })
    .eq("id", id);
  if (error) return { error: "Could not confirm the event." };
  dispatchSoon();
  revalidatePath("/", "layout");
  return { ok: "Confirmed and marked verified." };
}

export async function setEventStatus(_p: ReviewState, f: FormData): Promise<ReviewState> {
  const admin = await requireAdmin();
  const id = text(f, "eventId");
  const status = text(f, "status");
  if (!uuid(id) || !["rejected", "cancelled", "stale", "pending_verification"].includes(status)) return { error: "Invalid request." };
  const db = createServiceClient();
  const { error } = await db
    .from("events")
    .update({ verification_status: status, reviewed_note: text(f, "note") || null, verified_by: admin.id, ...(status === "pending_verification" ? { verified_at: null } : {}) })
    .eq("id", id);
  if (error) return { error: "Could not update the event." };
  if (status === "cancelled") dispatchSoon(); // tells people who were already alerted
  revalidatePath("/", "layout");
  return { ok: `Marked ${status.replace("_", " ")}.` };
}

/** Owner corrects details. Dates are only accepted as YYYY-MM-DD or YYYY-MM. */
export async function editEvent(_p: ReviewState, f: FormData): Promise<ReviewState> {
  await requireAdmin();
  const id = text(f, "eventId");
  if (!uuid(id)) return { error: "Invalid event." };
  const dateInput = text(f, "date");
  const d = parseDateField(dateInput || null);
  if (dateInput && d.precision === "unknown") return { error: "Date must look like 2026-12-05 or 2026-12." };
  const ticketUrl = text(f, "ticketUrl");
  if (ticketUrl && !httpUrl(ticketUrl)) return { error: "Ticket URL must start with https://" };
  const ticketStatus = text(f, "ticketStatus") || "unknown";
  if (!["upcoming", "tickets_available", "early_bird_announced", "early_bird_ending_soon", "sold_out", "unknown"].includes(ticketStatus)) return { error: "Invalid ticket status." };
  if ((ticketStatus === "early_bird_announced" || ticketStatus === "early_bird_ending_soon")) {
    return { error: "Early-bird status is set only by adding a verified ticket phase with evidence." };
  }
  const db = createServiceClient();
  const { error } = await db
    .from("events")
    .update({
      title: text(f, "title") || undefined,
      venue: text(f, "venue") || null,
      city: text(f, "city") || null,
      ticket_url: ticketUrl || null,
      ticket_status: ticketStatus,
      starts_at: d.startsAt,
      date_precision: d.precision,
      date_text: dateInput || null,
      has_conflict: f.get("clearConflict") === "on" ? false : undefined,
    })
    .eq("id", id);
  if (error) return { error: "Could not save the changes." };
  revalidatePath("/", "layout");
  return { ok: "Details saved." };
}

/** Adds a verified ticket phase. A verified phase must carry evidence (also enforced by a database constraint). */
export async function addTicketPhase(_p: ReviewState, f: FormData): Promise<ReviewState> {
  const admin = await requireAdmin();
  const id = text(f, "eventId");
  const phase = text(f, "phase");
  const evidenceUrl = text(f, "evidenceUrl");
  const excerpt = text(f, "excerpt");
  if (!uuid(id) || !["early_bird", "phase_1", "phase_2", "general", "door"].includes(phase)) return { error: "Invalid request." };
  if (!httpUrl(evidenceUrl)) return { error: "Enter the URL of the page that states this phase." };
  if (excerpt.length < 8) return { error: "Quote the text on that page that states the phase and its deadline." };
  const endsRaw = text(f, "endsAt");
  const startsRaw = text(f, "startsAt");
  const toIso = (v: string) => (v ? new Date(`${v}:00+05:30`).toISOString() : null);
  let endsAt: string | null = null;
  let startsAt: string | null = null;
  try {
    endsAt = toIso(endsRaw);
    startsAt = toIso(startsRaw);
  } catch {
    return { error: "Check the date/time values." };
  }
  if (phase === "early_bird" && !endsAt) return { error: "An early-bird alert needs a confirmed end date/time. If the page gives no deadline, leave the phase out." };

  const db = createServiceClient();
  const now = new Date().toISOString();
  const { data: ev, error: evErr } = await db
    .from("event_evidence")
    .insert({ event_id: id, kind: endsAt ? "deadline" : "ticket_phase", evidence_url: evidenceUrl, excerpt: `[Owner-reviewed] ${excerpt.slice(0, 500)}`, checked_by: admin.id, checked_at: now })
    .select("id")
    .single();
  if (evErr || !ev) return { error: "Could not store the evidence." };
  const { error } = await db.from("ticket_phases").insert({
    event_id: id, phase, starts_at: startsAt, ends_at: endsAt, price_text: text(f, "price") || null,
    verification_status: "verified", evidence_id: ev.id, verified_at: now,
  });
  if (error) return { error: "Could not save the ticket phase." };
  if (phase === "early_bird") {
    const soon = endsAt !== null && new Date(endsAt).getTime() - Date.now() < 72 * 3600 * 1000;
    await db.from("events").update({ ticket_status: soon ? "early_bird_ending_soon" : "early_bird_announced" }).eq("id", id);
  }
  dispatchSoon();
  revalidatePath("/", "layout");
  return { ok: "Ticket phase saved as verified, with its evidence." };
}
