import type { SupabaseClient } from "@supabase/supabase-js";
import type { FeedEvent, Prefs } from "../feed.ts";
import { eventDateParts, formatDateTime } from "../format.ts";
import { composeAlert, type AlertContext, type ComposedAlert } from "./messages.ts";
import { decideExisting, planNotifications, type AlertKind, type Channel, type NotifyUser, type PhaseInfo, type PlannedAlert } from "./plan.ts";
import { sanitizeError, sendEmail, sendTelegram, type SendResult } from "./providers.ts";

export interface DispatchStats {
  planned: number;
  sent: number;
  failed: number;
  duplicatesPrevented: number;
  deferred: number;
  exhausted: number;
  inFlight: number;
  cappedForNextRun: number;
  disabled?: boolean;
}

const emptyStats = (): DispatchStats => ({ planned: 0, sent: 0, failed: 0, duplicatesPrevented: 0, deferred: 0, exhausted: 0, inFlight: 0, cappedForNextRun: 0 });
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** App links are included only when APP_BASE_URL is a public https address (localhost links are useless in Telegram/email). */
function eventLink(eventId: string): string | null {
  const base = process.env.APP_BASE_URL?.trim().replace(/\/$/, "");
  return base && base.startsWith("https://") ? `${base}/events/${eventId}` : null;
}

// ---------- loading ----------

async function loadEvents(db: SupabaseClient): Promise<FeedEvent[]> {
  const { data, error } = await db
    .from("events")
    .select(
      `id, title, starts_at, date_text, date_precision, venue, city, ticket_url, ticket_status,
       verification_status, corroborated, has_conflict, is_sample, last_checked_at, discovered_at,
       event_artists ( artists ( id, name, artist_genres ( genres ( slug ) ) ) ),
       event_sources ( source_url, source_title ),
       ticket_phases ( phase, ends_at, verification_status )`,
    );
  if (error) throw new Error(`load events: ${error.message}`);
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
      .map((a) => ({ id: a.id, name: a.name, genreSlugs: a.artist_genres.map((g) => g.genres?.slug).filter((s): s is string => Boolean(s)) })),
    sources: r.event_sources.map((s) => ({ url: s.source_url, title: s.source_title })),
    phases: r.ticket_phases,
  }));
}

async function loadPhases(db: SupabaseClient): Promise<PhaseInfo[]> {
  const { data, error } = await db
    .from("ticket_phases")
    .select("id, event_id, phase, ends_at, verification_status, price_text, event_evidence ( evidence_url, excerpt )");
  if (error) throw new Error(`load phases: ${error.message}`);
  return (data ?? []).map((p) => {
    const ev = p.event_evidence as unknown as { evidence_url: string; excerpt: string | null } | null;
    return {
      id: p.id,
      eventId: p.event_id,
      phase: p.phase,
      endsAt: p.ends_at,
      verified: p.verification_status === "verified",
      evidenceUrl: ev?.evidence_url ?? null,
      excerpt: ev?.excerpt ?? null,
      price: p.price_text,
    };
  });
}

export async function loadNotifyUsers(db: SupabaseClient): Promise<NotifyUser[]> {
  const [{ data: profiles }, { data: up }, { data: ug }, { data: follows }, { data: np }] = await Promise.all([
    db.from("profiles").select("id, is_admin"),
    db.from("user_preferences").select("*"),
    db.from("user_genres").select("user_id, genres(slug)"),
    db.from("user_artist_follows").select("user_id, artist_id"),
    db.from("notification_preferences").select("*"),
  ]);
  return (profiles ?? []).map((p) => {
    const prefsRow = (up ?? []).find((x) => x.user_id === p.id);
    const n = (np ?? []).find((x) => x.user_id === p.id);
    const prefs: Prefs = {
      allGenres: prefsRow?.all_genres ?? true,
      strictGenreMode: prefsRow?.strict_genre_mode ?? false,
      genreSlugs: ((ug ?? []) as unknown as { user_id: string; genres: { slug: string } | null }[])
        .filter((g) => g.user_id === p.id).map((g) => g.genres?.slug).filter((s): s is string => Boolean(s)),
      cities: prefsRow?.cities ?? ["Bengaluru"],
      showOtherCities: prefsRow?.show_other_indian_cities ?? true,
      followedArtistIds: (follows ?? []).filter((f) => f.user_id === p.id).map((f) => f.artist_id),
    };
    // The owner (admin) may fall back to the server-configured chat/email; everyone else needs their own.
    const chatId = n?.telegram_chat_id || (p.is_admin ? process.env.TELEGRAM_CHAT_ID || null : null);
    const address = n?.email_address || (p.is_admin ? process.env.ALERT_TO_EMAIL || null : null);
    return {
      id: p.id,
      prefs,
      telegram: { enabled: n?.telegram_enabled ?? true, chatId },
      email: { enabled: n?.email_enabled ?? true, address },
      types: { newConcert: n?.new_concert_alerts ?? true, earlyBird: n?.early_bird_alerts ?? true, deadline: n?.deadline_reminders ?? true },
    };
  });
}

// ---------- message building ----------

function contextFor(item: PlannedAlert, e: FeedEvent, phases: PhaseInfo[]): AlertContext {
  const d = eventDateParts(e);
  const p = item.phaseId ? phases.find((x) => x.id === item.phaseId) : undefined;
  return {
    kind: item.kind,
    artists: e.artists.map((a) => a.name).join(" + ") || e.title,
    title: e.title,
    venue: e.venue,
    city: e.city,
    dateLabel: d.full,
    verified: e.verification_status === "verified",
    corroborated: e.corroborated,
    ticketUrl: e.ticket_url,
    sourceLinks: e.sources.map((s) => ({ url: s.url, label: s.title ?? "link" })),
    eventUrl: eventLink(e.id),
    changeLabel: item.changeLabel,
    phase: p && p.evidenceUrl
      ? { name: p.phase.replace("_", " "), endsLabel: p.endsAt ? formatDateTime(p.endsAt) : null, evidenceUrl: p.evidenceUrl, excerpt: p.excerpt, price: p.price }
      : undefined,
  };
}

// ---------- delivery with reservation, dedupe and retry ----------

export interface DeliverArgs {
  userId: string | null;
  eventId: string | null;
  phaseId: string | null;
  type: AlertKind | "test";
  channel: Channel;
  recipient: string;
  dedupeKey: string;
  message: ComposedAlert;
}

export type DeliverOutcome = "sent" | "failed" | "duplicate" | "deferred" | "exhausted" | "in_flight";

/**
 * Reserves a log row first (unique on dedupe key + channel + recipient), then sends.
 * A second attempt for the same alert is blocked, a failed one is retried with backoff
 * (max 3 attempts), and a failure is never recorded as delivered.
 */
export async function deliver(db: SupabaseClient, a: DeliverArgs, now = new Date()): Promise<{ outcome: DeliverOutcome; error?: string | null }> {
  const base = {
    user_id: a.userId, event_id: a.eventId, phase_id: a.phaseId, notification_type: a.type, channel: a.channel,
    recipient: a.recipient, dedupe_key: a.dedupeKey,
  };
  const iso = now.toISOString();
  const ins = await db.from("notification_log").insert({ ...base, status: "pending", attempt_count: 1, last_attempt_at: iso }).select("id, attempt_count").single();
  let logId: string;
  let attempt = 1;

  if (ins.error) {
    if (ins.error.code !== "23505") return { outcome: "failed", error: sanitizeError(ins.error.message) };
    const { data: row } = await db.from("notification_log").select("*").eq("dedupe_key", a.dedupeKey).eq("channel", a.channel).eq("recipient", a.recipient).single();
    if (!row) return { outcome: "failed", error: "could not read existing log row" };
    const decision = decideExisting(row, now);
    if (decision === "duplicate") {
      await db.from("notification_log").update({ duplicates_prevented: (row.duplicates_prevented ?? 0) + 1 }).eq("id", row.id);
      return { outcome: "duplicate" };
    }
    if (decision === "defer") return { outcome: "deferred" };
    if (decision === "exhausted") return { outcome: "exhausted", error: row.error };
    if (decision === "in_flight") return { outcome: "in_flight" };
    // retry: claim it atomically so two runners never send the same retry
    const claimed = await db
      .from("notification_log")
      .update({ status: "pending", attempt_count: row.attempt_count + 1, last_attempt_at: iso })
      .eq("id", row.id).eq("status", row.status).eq("attempt_count", row.attempt_count)
      .select("id");
    if (!claimed.data?.length) return { outcome: "in_flight" };
    logId = row.id;
    attempt = row.attempt_count + 1;
  } else {
    logId = ins.data.id;
  }

  const res: SendResult =
    a.channel === "telegram"
      ? await sendTelegram(a.recipient, a.message.telegramHtml)
      : await sendEmail(a.recipient, a.message.subject, a.message.emailHtml, a.message.emailText);

  await db.from("notification_log").update(
    res.ok
      ? { status: "sent", sent_at: new Date().toISOString(), provider_ref: res.providerRef, error: null, attempt_count: attempt }
      : { status: "failed", error: res.error, attempt_count: attempt },
  ).eq("id", logId);
  return { outcome: res.ok ? "sent" : "failed", error: res.error };
}

// ---------- the dispatcher ----------

export interface DispatchOptions {
  dryRun?: boolean;
  maxSends?: number; // flood guard per run
  now?: Date;
}

export async function runDispatch(db: SupabaseClient, opts: DispatchOptions = {}): Promise<DispatchStats & { plan: PlannedAlert[] }> {
  const stats = emptyStats();
  if (process.env.NOTIFICATIONS_ENABLED === "false") return { ...stats, disabled: true, plan: [] };
  const now = opts.now ?? new Date();
  const maxSends = opts.maxSends ?? 20;

  const [users, events, phases, { data: sentRows }] = await Promise.all([
    loadNotifyUsers(db),
    loadEvents(db),
    loadPhases(db),
    db.from("notification_log").select("user_id, event_id").eq("status", "sent").in("notification_type", ["new_concert", "early_bird_verified"]),
  ]);
  const alreadyAlerted = new Set((sentRows ?? []).filter((r) => r.user_id && r.event_id).map((r) => `${r.user_id}|${r.event_id}`));
  const plan = planNotifications({ users, events, phases, alreadyAlerted, now });
  stats.planned = plan.reduce((n, p) => n + p.channels.length, 0);
  if (opts.dryRun) return { ...stats, plan };

  let sends = 0;
  let lastTelegram = 0;
  for (const item of plan) {
    const e = events.find((x) => x.id === item.eventId);
    if (!e) continue;
    const message = composeAlert(contextFor(item, e, phases));
    for (const ch of item.channels) {
      if (sends >= maxSends) {
        stats.cappedForNextRun++;
        continue;
      }
      if (ch.channel === "telegram") {
        const wait = 1100 - (Date.now() - lastTelegram);
        if (wait > 0) await sleep(wait); // Telegram allows about 1 message/second to one chat
      }
      const r = await deliver(db, { userId: item.userId, eventId: item.eventId, phaseId: item.phaseId, type: item.kind, channel: ch.channel, recipient: ch.recipient, dedupeKey: item.dedupeKey, message }, now);
      if (ch.channel === "telegram") lastTelegram = Date.now();
      if (r.outcome === "sent") { stats.sent++; sends++; }
      else if (r.outcome === "failed") { stats.failed++; sends++; }
      else if (r.outcome === "duplicate") stats.duplicatesPrevented++;
      else if (r.outcome === "deferred") stats.deferred++;
      else if (r.outcome === "exhausted") stats.exhausted++;
      else stats.inFlight++;
    }
  }
  return { ...stats, plan };
}

/** Sends a clearly labelled TEST alert (never stored as an event) through the same dedupe/log path. */
export async function sendTestAlert(
  db: SupabaseClient,
  args: { userId: string; telegramChatId?: string | null; emailAddress?: string | null; nonce: string },
) {
  const message = composeAlert({
    kind: "test", artists: "Sample Artist", title: "Sample concert (not real)", venue: "Sample Venue", city: "Bengaluru",
    dateLabel: "Sample date", verified: false, corroborated: false, ticketUrl: null, sourceLinks: [], eventUrl: null,
  });
  const results: { channel: Channel; outcome: DeliverOutcome; error?: string | null }[] = [];
  if (args.telegramChatId) {
    const r = await deliver(db, { userId: args.userId, eventId: null, phaseId: null, type: "test", channel: "telegram", recipient: args.telegramChatId, dedupeKey: `test:${args.nonce}`, message });
    results.push({ channel: "telegram", ...r });
  }
  if (args.emailAddress) {
    const r = await deliver(db, { userId: args.userId, eventId: null, phaseId: null, type: "test", channel: "email", recipient: args.emailAddress, dedupeKey: `test:${args.nonce}`, message });
    results.push({ channel: "email", ...r });
  }
  return results;
}
