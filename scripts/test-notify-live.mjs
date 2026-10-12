// Sends ONE labelled TEST alert per configured channel, then repeats it to prove duplicate blocking.
// Run: node --env-file=.env.local scripts/test-notify-live.mjs [--email]
import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { sendTestAlert } from "../src/lib/notify/dispatch.ts";

const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SECRET_KEY, { auth: { persistSession: false } });
const OWNER = "00000000-0000-4000-8000-000000000001";
const withEmail = process.argv.includes("--email");
const nonce = randomUUID();
const args = {
  userId: OWNER, nonce,
  telegramChatId: process.env.TELEGRAM_CHAT_ID || null,
  emailAddress: withEmail ? process.env.ALERT_TO_EMAIL || null : null,
};
console.log("first send :", JSON.stringify(await sendTestAlert(db, args)));
console.log("second send:", JSON.stringify(await sendTestAlert(db, args)), "(same alert id, must be blocked)");
const { data } = await db.from("notification_log").select("channel,status,attempt_count,duplicates_prevented,provider_ref,error").eq("dedupe_key", `test:${nonce}`);
console.log("log rows   :", JSON.stringify(data));
