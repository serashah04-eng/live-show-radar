"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { isLocalOwnerMode } from "@/lib/local-mode";
import { sendTestAlert } from "@/lib/notify/dispatch";
import { sanitizeError } from "@/lib/notify/providers";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

export interface ProfileState {
  error?: string;
  saved?: string;
}

const bool = (f: FormData, k: string) => f.get(k) === "on";
const clean = (v: FormDataEntryValue | null) => String(v ?? "").trim().replace(/\s+/g, " ");

/** Saves who you are and where alerts should go. Name and phone live on your profile; email and Telegram are your alert channels. */
export async function saveProfile(_prev: ProfileState, formData: FormData): Promise<ProfileState> {
  const user = await requireUser();
  const name = clean(formData.get("full_name")).slice(0, 80);
  const phone = clean(formData.get("phone"));
  const email = clean(formData.get("email_address"));
  const chatId = clean(formData.get("telegram_chat_id"));

  if (phone && !/^\+?[0-9 ()-]{7,18}$/.test(phone)) return { error: "Enter a phone number with 7 to 15 digits, for example +91 98765 43210." };
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: "Enter a valid email address." };
  if (chatId && !/^-?\d{5,20}$/.test(chatId)) return { error: "Telegram chat ID is a number, for example 123456789. See the steps on this page." };

  const sb = await createClient(); // row-level security: you can only write your own rows
  const [prefs, meta] = await Promise.all([
    sb.from("notification_preferences").upsert({
      user_id: user.id,
      email_address: email || null,
      email_enabled: bool(formData, "email_enabled"),
      telegram_chat_id: chatId || null,
      telegram_enabled: bool(formData, "telegram_enabled"),
    }),
    isLocalOwnerMode() ? Promise.resolve({ error: null }) : sb.auth.updateUser({ data: { full_name: name || null, phone: phone || null } }),
  ]);
  if (prefs.error) return { error: `Could not save: ${prefs.error.message}` };
  if (meta.error) return { error: `Could not save your name and phone: ${meta.error.message}` };
  revalidatePath("/", "layout");
  return { saved: "Profile saved. Alerts and pop-ups now go to these details." };
}

/** Sends a clearly labelled TEST alert to what is currently saved (Telegram and/or email) and says what happened. */
export async function sendProfileTest(_prev: ProfileState): Promise<ProfileState> {
  const user = await requireUser();
  const sb = await createClient();
  const { data } = await sb.from("notification_preferences").select("telegram_chat_id, telegram_enabled, email_address, email_enabled").eq("user_id", user.id).maybeSingle();
  const tg = data?.telegram_enabled && data.telegram_chat_id ? (data.telegram_chat_id as string) : null;
  const mail = data?.email_enabled && data.email_address ? (data.email_address as string) : null;
  if (!tg && !mail) return { error: "Save a Telegram chat ID or an email address first (and keep that channel switched on), then send the test." };
  try {
    const results = await sendTestAlert(createServiceClient(), { userId: user.id, telegramChatId: tg, emailAddress: mail, nonce: randomUUID() });
    const ok = results.filter((r) => r.outcome === "sent").map((r) => r.channel);
    const bad = results.filter((r) => r.outcome !== "sent");
    if (bad.length && !ok.length) return { error: `Test not delivered: ${bad.map((b) => `${b.channel}: ${sanitizeError(b.error ?? "failed")}`).join("; ")}` };
    return { saved: `Test alert sent via ${ok.join(" and ")}.${bad.length ? ` Not delivered: ${bad.map((b) => b.channel).join(", ")}.` : ""}` };
  } catch (e) {
    return { error: `Test not delivered: ${sanitizeError(e instanceof Error ? e.message : "failed")}` };
  }
}
