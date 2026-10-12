// Pure alert planning: who should be told what, on which channel. No I/O, fully unit tested.
import { buildFeed, type FeedEvent, type Prefs } from "../feed.ts";

export type AlertKind = "new_concert" | "early_bird_verified" | "deadline_reminder" | "status_change";
export type Channel = "telegram" | "email";

export interface PhaseInfo {
  id: string;
  eventId: string;
  phase: string;
  endsAt: string | null;
  verified: boolean;
  evidenceUrl: string | null;
  excerpt: string | null;
  price: string | null;
}

export interface NotifyUser {
  id: string;
  prefs: Prefs;
  telegram: { enabled: boolean; chatId: string | null };
  email: { enabled: boolean; address: string | null };
  types: { newConcert: boolean; earlyBird: boolean; deadline: boolean };
}

export interface PlannedAlert {
  userId: string;
  kind: AlertKind;
  eventId: string;
  phaseId: string | null;
  dedupeKey: string;
  changeLabel?: string;
  channels: { channel: Channel; recipient: string }[];
}

const DAY = 24 * 3600 * 1000;

function channelsFor(u: NotifyUser) {
  const out: { channel: Channel; recipient: string }[] = [];
  if (u.telegram.enabled && u.telegram.chatId) out.push({ channel: "telegram", recipient: u.telegram.chatId });
  if (u.email.enabled && u.email.address) out.push({ channel: "email", recipient: u.email.address });
  return out;
}

/** Only evidence-backed information may trigger alerts: verified, or corroborated without conflict. */
export function alertableEvent(e: FeedEvent): boolean {
  if (e.is_sample) return false;
  if (e.verification_status === "verified") return true;
  return e.verification_status === "pending_verification" && e.corroborated && !e.has_conflict;
}

export function planNotifications(args: {
  users: NotifyUser[];
  events: FeedEvent[];
  phases: PhaseInfo[];
  /** `${userId}|${eventId}` pairs this user has already been told about (for status changes). */
  alreadyAlerted: Set<string>;
  now: Date;
}): PlannedAlert[] {
  const { users, events, phases, alreadyAlerted, now } = args;
  const plan: PlannedAlert[] = [];
  const phasesByEvent = new Map<string, PhaseInfo[]>();
  for (const p of phases) phasesByEvent.set(p.eventId, [...(phasesByEvent.get(p.eventId) ?? []), p]);

  for (const u of users) {
    const channels = channelsFor(u);
    if (channels.length === 0) continue;
    // The feed applies the user's saved genres, followed artists and city rules.
    const visible = buildFeed(events, u.prefs, { scope: "genres" }, now).map((i) => i.event);

    for (const e of visible) {
      if (u.types.newConcert && alertableEvent(e)) {
        plan.push({ userId: u.id, kind: "new_concert", eventId: e.id, phaseId: null, dedupeKey: `new_concert:${e.id}`, channels });
      }
      if (e.verification_status !== "verified") continue;
      for (const p of phasesByEvent.get(e.id) ?? []) {
        // Verified phase with explicit evidence and a stated, future deadline only.
        if (!p.verified || !p.evidenceUrl || !p.endsAt) continue;
        const ends = new Date(p.endsAt).getTime();
        if (ends <= now.getTime()) continue;
        if (p.phase === "early_bird" && u.types.earlyBird) {
          plan.push({ userId: u.id, kind: "early_bird_verified", eventId: e.id, phaseId: p.id, dedupeKey: `early_bird:${p.id}`, channels });
        }
        if (u.types.deadline && ends - now.getTime() <= DAY) {
          plan.push({ userId: u.id, kind: "deadline_reminder", eventId: e.id, phaseId: p.id, dedupeKey: `deadline24:${p.id}`, channels });
        }
      }
    }

    // Material changes for events this user was already told about.
    if (u.types.newConcert || u.types.earlyBird) {
      for (const e of events) {
        if (!alreadyAlerted.has(`${u.id}|${e.id}`) || e.is_sample) continue;
        if (e.verification_status === "cancelled") {
          plan.push({ userId: u.id, kind: "status_change", eventId: e.id, phaseId: null, dedupeKey: `status:${e.id}:cancelled`, changeLabel: "this show has been marked cancelled", channels });
        } else if (e.ticket_status === "sold_out") {
          plan.push({ userId: u.id, kind: "status_change", eventId: e.id, phaseId: null, dedupeKey: `status:${e.id}:sold_out`, changeLabel: "tickets are listed as sold out", channels });
        }
      }
    }
  }

  const rank: Record<AlertKind, number> = { early_bird_verified: 0, deadline_reminder: 1, status_change: 2, new_concert: 3 };
  return plan.sort((a, b) => rank[a.kind] - rank[b.kind]);
}

export const MAX_ATTEMPTS = 3;
export const RETRY_BACKOFF_MIN = 15;
export const STALE_PENDING_MIN = 10;

export type ReservationDecision = "send" | "duplicate" | "defer" | "exhausted" | "in_flight";

/** Decides what to do when a log row already exists for the same alert, channel and recipient. */
export function decideExisting(row: { status: string; attempt_count: number; last_attempt_at: string | null }, now: Date): ReservationDecision {
  if (row.status === "sent") return "duplicate";
  const last = row.last_attempt_at ? new Date(row.last_attempt_at).getTime() : 0;
  const ageMin = (now.getTime() - last) / 60000;
  if (row.status === "pending" && ageMin < STALE_PENDING_MIN) return "in_flight";
  if (row.attempt_count >= MAX_ATTEMPTS) return "exhausted";
  if (ageMin < RETRY_BACKOFF_MIN * row.attempt_count) return "defer";
  return "send";
}
