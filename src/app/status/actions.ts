"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { runDispatch, sendTestAlert } from "@/lib/notify/dispatch";
import { createServiceClient } from "@/lib/supabase/service";

export interface StatusActionState {
  lines?: string[];
  error?: string;
}

/** Sends one clearly labelled TEST message to the owner's configured Telegram chat and email. */
export async function sendTest(): Promise<StatusActionState> {
  const admin = await requireAdmin();
  const telegramChatId = process.env.TELEGRAM_CHAT_ID || null;
  const emailAddress = process.env.ALERT_TO_EMAIL || null;
  if (!telegramChatId && !emailAddress) return { error: "Neither TELEGRAM_CHAT_ID nor ALERT_TO_EMAIL is set in the server environment." };
  const results = await sendTestAlert(createServiceClient(), { userId: admin.id, telegramChatId, emailAddress, nonce: randomUUID() });
  revalidatePath("/status");
  return {
    lines: [
      ...results.map((r) => `${r.channel}: ${r.outcome}${r.error ? `: ${r.error}` : ""}`),
      ...(emailAddress ? [] : ["email: skipped (ALERT_TO_EMAIL is not set)"]),
      ...(telegramChatId ? [] : ["telegram: skipped (TELEGRAM_CHAT_ID is not set)"]),
    ],
  };
}

/** Runs one alert cycle now (or previews it). Same code path as the scheduled job. */
export async function runAlertsNow(_p: StatusActionState, formData: FormData): Promise<StatusActionState> {
  await requireAdmin();
  const dryRun = formData.get("mode") === "preview";
  const { plan, ...s } = await runDispatch(createServiceClient(), { dryRun });
  revalidatePath("/status");
  revalidatePath("/");
  return {
    lines: [
      s.disabled ? "Notifications are switched off (NOTIFICATIONS_ENABLED=false)." : dryRun ? "Preview only: nothing was sent." : "Alert cycle finished.",
      `Planned messages: ${s.planned} (${plan.length} alerts)`,
      `Sent: ${s.sent} · Failed: ${s.failed} · Duplicates prevented: ${s.duplicatesPrevented}`,
      `Waiting to retry: ${s.deferred} · Gave up after 3 tries: ${s.exhausted} · Held for next run (flood guard): ${s.cappedForNextRun}`,
      ...plan.slice(0, 8).map((p) => `• ${p.kind} → ${p.channels.map((c) => c.channel).join(" + ")}`),
    ],
  };
}
