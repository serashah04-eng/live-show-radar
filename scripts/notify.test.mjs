// Notification rule tests (no network). Run: node --test scripts/notify.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import { planNotifications, decideExisting, alertableEvent } from "../src/lib/notify/plan.ts";
import { composeAlert } from "../src/lib/notify/messages.ts";
import { sanitizeError } from "../src/lib/notify/providers.ts";

const NOW = new Date("2026-10-12T10:00:00Z");
const hours = (h) => new Date(NOW.getTime() + h * 3600 * 1000).toISOString();
const A = { id: "a1", name: "Anuv Jain", genreSlugs: ["indie-pop"] };

const ev = (id, over = {}) => ({
  id, title: "Show", starts_at: "2026-12-01T00:00:00Z", date_text: null, date_precision: "day", venue: "Hall", city: "Bengaluru",
  ticket_url: null, ticket_status: "unknown", verification_status: "verified", corroborated: false, has_conflict: false, is_sample: false,
  last_checked_at: null, discovered_at: "2026-10-01T00:00:00Z", artists: [A], sources: [{ url: "https://x.com/e", title: "x.com" }], phases: [], ...over,
});
const user = (over = {}) => ({
  id: "u1",
  prefs: { allGenres: true, strictGenreMode: false, genreSlugs: [], cities: ["Bengaluru"], showOtherCities: true, followedArtistIds: ["a1"] },
  telegram: { enabled: true, chatId: "123456" },
  email: { enabled: true, address: "me@example.com" },
  types: { newConcert: true, earlyBird: true, deadline: true },
  ...over,
});
const phase = (over = {}) => ({ id: "p1", eventId: "e1", phase: "early_bird", endsAt: hours(48), verified: true, evidenceUrl: "https://x.com/e", excerpt: "Early bird ends 14 Oct", price: null, ...over });
const plan = (o) => planNotifications({ users: [user()], events: [ev("e1")], phases: [], alreadyAlerted: new Set(), now: NOW, ...o });
const kinds = (p) => p.map((x) => x.kind);

test("verified matching concert alerts on both channels", () => {
  const [p] = plan({});
  assert.equal(p.kind, "new_concert");
  assert.deepEqual(p.channels.map((c) => c.channel).sort(), ["email", "telegram"]);
  assert.equal(p.dedupeKey, "new_concert:e1");
});

test("disabling Telegram stops Telegram alerts while email continues", () => {
  const [p] = plan({ users: [user({ telegram: { enabled: false, chatId: "123456" } })] });
  assert.deepEqual(p.channels.map((c) => c.channel), ["email"]);
});

test("disabling email leaves Telegram working; both off means nothing is planned", () => {
  assert.deepEqual(plan({ users: [user({ email: { enabled: false, address: "a@b.co" } })] })[0].channels.map((c) => c.channel), ["telegram"]);
  assert.equal(plan({ users: [user({ telegram: { enabled: false, chatId: "1" }, email: { enabled: false, address: "a@b.co" } })] }).length, 0);
});

test("a channel without a recipient is skipped, not faked", () => {
  const [p] = plan({ users: [user({ telegram: { enabled: true, chatId: null } })] });
  assert.deepEqual(p.channels.map((c) => c.channel), ["email"]);
});

test("unconfirmed single-source events never alert", () => {
  assert.equal(plan({ events: [ev("e1", { verification_status: "pending_verification" })] }).length, 0);
});

test("corroborated events alert, but not when sources conflict", () => {
  assert.equal(kinds(plan({ events: [ev("e1", { verification_status: "pending_verification", corroborated: true })] })).join(), "new_concert");
  assert.equal(plan({ events: [ev("e1", { verification_status: "pending_verification", corroborated: true, has_conflict: true })] }).length, 0);
});

test("sample events never alert", () => {
  assert.equal(alertableEvent(ev("e1", { is_sample: true })), false);
  assert.equal(plan({ events: [ev("e1", { is_sample: true })] }).length, 0);
});

test("alerts respect saved preferences: unfollowed artist and unselected genre produce nothing", () => {
  const u = user({ prefs: { allGenres: false, strictGenreMode: false, genreSlugs: ["rock"], cities: ["Bengaluru"], showOtherCities: true, followedArtistIds: [] } });
  assert.equal(plan({ users: [u] }).length, 0);
});

test("verified early-bird with evidence and future deadline triggers an urgent alert", () => {
  const p = plan({ phases: [phase()] });
  assert.ok(kinds(p).includes("early_bird_verified"));
  assert.equal(p[0].kind, "early_bird_verified"); // urgent first
  assert.equal(p.find((x) => x.kind === "early_bird_verified").dedupeKey, "early_bird:p1");
});

test("early-bird alerts need verified status, evidence, a stated deadline, and a future end", () => {
  const none = (ph) => assert.ok(!kinds(plan({ phases: [ph] })).includes("early_bird_verified"));
  none(phase({ verified: false }));
  none(phase({ evidenceUrl: null }));
  none(phase({ endsAt: null }));
  none(phase({ endsAt: hours(-2) }));
});

test("early-bird alerts need a VERIFIED event, not just a corroborated one", () => {
  const e = ev("e1", { verification_status: "pending_verification", corroborated: true });
  assert.ok(!kinds(plan({ events: [e], phases: [phase()] })).includes("early_bird_verified"));
});

test("disabling early-bird alerts stops them but keeps data and the new-concert alert", () => {
  const phases = [phase()];
  const events = [ev("e1")];
  const p = plan({ users: [user({ types: { newConcert: true, earlyBird: false, deadline: true } })], phases, events });
  assert.ok(!kinds(p).includes("early_bird_verified"));
  assert.ok(kinds(p).includes("new_concert"));
  assert.equal(phases.length, 1); // verified information untouched
});

test("deadline reminders fire only inside 24h and only when enabled", () => {
  assert.ok(kinds(plan({ phases: [phase({ endsAt: hours(10) })] })).includes("deadline_reminder"));
  assert.ok(!kinds(plan({ phases: [phase({ endsAt: hours(48) })] })).includes("deadline_reminder"));
  assert.ok(!kinds(plan({ users: [user({ types: { newConcert: true, earlyBird: true, deadline: false } })], phases: [phase({ endsAt: hours(10) })] })).includes("deadline_reminder"));
});

test("status-change alerts only go to users already told about the event", () => {
  const cancelled = ev("e1", { verification_status: "cancelled" });
  assert.equal(plan({ events: [cancelled] }).length, 0);
  const p = plan({ events: [cancelled], alreadyAlerted: new Set(["u1|e1"]) });
  assert.equal(p[0].kind, "status_change");
  assert.equal(p[0].dedupeKey, "status:e1:cancelled");
});

test("dedupe keys are stable: planning twice gives identical keys", () => {
  const a = plan({ phases: [phase()] }).map((x) => x.dedupeKey);
  const b = plan({ phases: [phase()] }).map((x) => x.dedupeKey);
  assert.deepEqual(a, b);
});

test("retry rules: sent is a duplicate, fresh failure waits, old failure retries, 3 attempts is final", () => {
  const ago = (min) => new Date(NOW.getTime() - min * 60000).toISOString();
  assert.equal(decideExisting({ status: "sent", attempt_count: 1, last_attempt_at: ago(500) }, NOW), "duplicate");
  assert.equal(decideExisting({ status: "failed", attempt_count: 1, last_attempt_at: ago(2) }, NOW), "defer");
  assert.equal(decideExisting({ status: "failed", attempt_count: 1, last_attempt_at: ago(20) }, NOW), "send");
  assert.equal(decideExisting({ status: "failed", attempt_count: 2, last_attempt_at: ago(20) }, NOW), "defer"); // backoff grows
  assert.equal(decideExisting({ status: "failed", attempt_count: 2, last_attempt_at: ago(40) }, NOW), "send");
  assert.equal(decideExisting({ status: "failed", attempt_count: 3, last_attempt_at: ago(999) }, NOW), "exhausted");
  assert.equal(decideExisting({ status: "pending", attempt_count: 1, last_attempt_at: ago(1) }, NOW), "in_flight");
  assert.equal(decideExisting({ status: "pending", attempt_count: 1, last_attempt_at: ago(30) }, NOW), "send"); // crashed run
});

test("messages state certainty honestly and include evidence for verified deadlines", () => {
  const base = { kind: "new_concert", artists: "Anuv Jain", title: "Route 143", venue: "EVP", city: "Chennai", dateLabel: "Sat 31 Oct", verified: false, corroborated: true, ticketUrl: null, sourceLinks: [{ url: "https://a.com/x", label: "a.com" }], eventUrl: null };
  const m = composeAlert(base);
  assert.match(m.emailText, /not confirmed by an official source/i);
  assert.match(m.subject, /not confirmed/);
  const eb = composeAlert({ ...base, kind: "early_bird_verified", verified: true, phase: { name: "early bird", endsLabel: "14 Oct", evidenceUrl: "https://a.com/x", excerpt: "ends 14 Oct", price: null } });
  assert.match(eb.emailText, /Evidence: https:\/\/a\.com\/x/);
  assert.match(eb.emailText, /Verified\./);
  const t = composeAlert({ ...base, kind: "test" });
  assert.match(t.emailText, /not a real concert/i);
});

test("message HTML escapes untrusted text", () => {
  const m = composeAlert({ kind: "new_concert", artists: "<b>x</b>", title: "<script>1</script>", venue: null, city: null, dateLabel: "d", verified: true, corroborated: false, ticketUrl: null, sourceLinks: [], eventUrl: null });
  assert.ok(!m.emailHtml.includes("<script>"));
  assert.ok(!m.telegramHtml.includes("<script>"));
});

test("errors never leak tokens or keys", () => {
  assert.ok(!sanitizeError("fail https://api.telegram.org/bot123456:ABC-def_ghi/sendMessage").includes("ABC-def"));
  assert.ok(!sanitizeError("Bearer re_abcDEF123 rejected").includes("abcDEF"));
});
