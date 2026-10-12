// Proves failures are recorded honestly and retries are controlled. Sends NO real message:
// it targets an invalid Telegram chat id, which Telegram rejects.
// Run: node --env-file=.env.local scripts/test-notify-failure.mjs
import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { composeAlert } from "../src/lib/notify/messages.ts";
import { deliver } from "../src/lib/notify/dispatch.ts";

const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SECRET_KEY, { auth: { persistSession: false } });
const OWNER = "00000000-0000-4000-8000-000000000001";
const key = `test:failure-${randomUUID()}`;
const message = composeAlert({ kind: "test", artists: "Sample", title: "Failure test", venue: null, city: null, dateLabel: "n/a", verified: false, corroborated: false, ticketUrl: null, sourceLinks: [], eventUrl: null });
const args = { userId: OWNER, eventId: null, phaseId: null, type: "test", channel: "telegram", recipient: "1", dedupeKey: key, message };
let fails = 0;
const check = (n, ok, note = "") => { if (!ok) fails++; console.log(`${ok ? "PASS" : "FAIL"} ${n}${note ? " - " + note : ""}`); };
const row = async () => (await db.from("notification_log").select("*").eq("dedupe_key", key).single()).data;

const r1 = await deliver(db, args);
let l = await row();
check("invalid chat is recorded as FAILED, not sent", r1.outcome === "failed" && l.status === "failed" && !l.sent_at, `status=${l.status}`);
check("error text is stored and contains no token", !!l.error && !/bot\d+:/i.test(l.error) && !(process.env.TELEGRAM_BOT_TOKEN && l.error.includes(process.env.TELEGRAM_BOT_TOKEN)), l.error);
check("attempt count is 1", l.attempt_count === 1);

const r2 = await deliver(db, args);
l = await row();
check("immediate retry is deferred by backoff (no flood)", r2.outcome === "deferred" && l.attempt_count === 1, `outcome=${r2.outcome}`);

// time-travel: pretend the last attempt was 20 minutes ago -> one retry is allowed
await db.from("notification_log").update({ last_attempt_at: new Date(Date.now() - 20 * 60000).toISOString() }).eq("id", l.id);
const r3 = await deliver(db, args);
l = await row();
check("after backoff exactly one retry runs", r3.outcome === "failed" && l.attempt_count === 2, `attempts=${l.attempt_count}`);

await db.from("notification_log").update({ attempt_count: 3, last_attempt_at: new Date(Date.now() - 999 * 60000).toISOString() }).eq("id", l.id);
const r4 = await deliver(db, args);
check("after 3 attempts it stops retrying", r4.outcome === "exhausted");

// duplicate prevention on a SENT row (simulated, nothing delivered)
const key2 = `test:dup-${randomUUID()}`;
await db.from("notification_log").insert({ user_id: OWNER, notification_type: "test", channel: "telegram", recipient: "1", dedupe_key: key2, status: "sent", attempt_count: 1, last_attempt_at: new Date().toISOString(), sent_at: new Date().toISOString() });
const r5 = await deliver(db, { ...args, dedupeKey: key2 });
const dup = (await db.from("notification_log").select("duplicates_prevented,status").eq("dedupe_key", key2).single()).data;
check("an already-sent alert is blocked as a duplicate and counted", r5.outcome === "duplicate" && dup.duplicates_prevented === 1 && dup.status === "sent");

await db.from("notification_log").delete().in("dedupe_key", [key, key2]); // clean up test rows
console.log(fails ? `\n${fails} FAILED` : "\nAll failure-handling checks passed");
process.exit(fails ? 1 : 0);
