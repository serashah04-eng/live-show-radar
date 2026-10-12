export interface SendResult {
  ok: boolean;
  providerRef: string | null;
  error: string | null;
}

/** Removes anything that looks like a bot token or API key from an error before it is stored or shown. */
export function sanitizeError(msg: unknown): string {
  return String(msg ?? "unknown error")
    .replace(/bot\d+:[\w-]+/gi, "bot***")
    .replace(/\bre_[A-Za-z0-9_]+/g, "re_***")
    .replace(/Bearer\s+\S+/gi, "Bearer ***")
    .slice(0, 300);
}

export async function sendTelegram(chatId: string, html: string): Promise<SendResult> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return { ok: false, providerRef: null, error: "TELEGRAM_BOT_TOKEN is not configured" };
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text: html.slice(0, 4000), parse_mode: "HTML", disable_web_page_preview: true }),
    });
    const j = (await res.json().catch(() => ({}))) as { ok?: boolean; description?: string; result?: { message_id?: number } };
    if (j.ok) return { ok: true, providerRef: String(j.result?.message_id ?? ""), error: null };
    return { ok: false, providerRef: null, error: sanitizeError(`Telegram ${res.status}: ${j.description ?? "send failed"}`) };
  } catch (e) {
    return { ok: false, providerRef: null, error: sanitizeError(e instanceof Error ? e.message : e) };
  }
}

export async function sendEmail(to: string, subject: string, html: string, text: string): Promise<SendResult> {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.ALERT_FROM_EMAIL;
  if (!key) return { ok: false, providerRef: null, error: "RESEND_API_KEY is not configured" };
  if (!from) return { ok: false, providerRef: null, error: "ALERT_FROM_EMAIL is not configured" };
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "content-type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({ from, to: [to], subject, html, text }),
    });
    const j = (await res.json().catch(() => ({}))) as { id?: string; message?: string; name?: string };
    if (res.ok && j.id) return { ok: true, providerRef: j.id, error: null };
    return { ok: false, providerRef: null, error: sanitizeError(`Resend ${res.status}: ${j.message ?? j.name ?? "send failed"}`) };
  } catch (e) {
    return { ok: false, providerRef: null, error: sanitizeError(e instanceof Error ? e.message : e) };
  }
}
