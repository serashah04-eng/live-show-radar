// Checks which integrations are configured and reachable. Never prints secret values.
// Run: node --env-file=.env.local scripts/check-integrations.mjs [--send-telegram]
const env = process.env;
const has = (k) => Boolean(env[k] && env[k].trim());
const line = (name, ok, note = "") => console.log(`${ok ? "OK  " : "FAIL"} ${name}${note ? " - " + note : ""}`);

console.log("== Variables set? (names only) ==");
for (const k of [
  "NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "SUPABASE_SECRET_KEY",
  "TICKETMASTER_API_KEY", "GEMINI_API_KEY", "TELEGRAM_BOT_TOKEN", "TELEGRAM_CHAT_ID",
  "RESEND_API_KEY", "ALERT_FROM_EMAIL", "CRON_SECRET",
]) line(k, has(k));

console.log("\n== Live checks ==");

if (has("NEXT_PUBLIC_SUPABASE_URL") && has("SUPABASE_SECRET_KEY")) {
  try {
    const r = await fetch(`${env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/`, {
      headers: { apikey: env.SUPABASE_SECRET_KEY },
    });
    line("Supabase REST", r.ok, `HTTP ${r.status}`);
  } catch (e) { line("Supabase REST", false, e.message); }
}

if (has("TICKETMASTER_API_KEY")) {
  try {
    const u = new URL("https://app.ticketmaster.com/discovery/v2/events.json");
    u.search = new URLSearchParams({ apikey: env.TICKETMASTER_API_KEY, countryCode: "IN", size: "5" });
    const r = await fetch(u);
    const j = await r.json().catch(() => ({}));
    line("Ticketmaster (India)", r.ok, `HTTP ${r.status}, events found: ${j?.page?.totalElements ?? "n/a"}`);
    const b = new URL(u); b.searchParams.set("city", "Bengaluru");
    const r2 = await fetch(b); const j2 = await r2.json().catch(() => ({}));
    line("Ticketmaster (Bengaluru)", r2.ok, `HTTP ${r2.status}, events found: ${j2?.page?.totalElements ?? "n/a"}`);
  } catch (e) { line("Ticketmaster", false, e.message); }
}

if (has("TELEGRAM_BOT_TOKEN")) {
  try {
    const r = await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/getMe`);
    const j = await r.json();
    line("Telegram token (getMe)", j.ok, j.ok ? `bot @${j.result.username}` : j.description);
    if (j.ok && !has("TELEGRAM_CHAT_ID")) {
      const u = await (await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/getUpdates`)).json();
      const ids = [...new Set((u.result ?? []).map((x) => x.message?.chat?.id).filter(Boolean))];
      console.log(`INFO chat ids seen in recent updates: ${ids.length ? ids.join(", ") : "none - open your bot in Telegram and send /start first"}`);
    }
    if (j.ok && has("TELEGRAM_CHAT_ID") && process.argv.includes("--send-telegram")) {
      const s = await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ chat_id: env.TELEGRAM_CHAT_ID, text: "Live Show Radar: Telegram test message." }),
      });
      const sj = await s.json();
      line("Telegram sendMessage", sj.ok, sj.ok ? "delivered" : sj.description);
    }
  } catch (e) { line("Telegram", false, e.message); }
}

if (has("GEMINI_API_KEY")) {
  try {
    const r = await fetch("https://generativelanguage.googleapis.com/v1beta/models?pageSize=100", {
      headers: { "x-goog-api-key": env.GEMINI_API_KEY },
    });
    const j = await r.json().catch(() => ({}));
    const flash = (j.models ?? []).map((m) => m.name).filter((n) => /flash/i.test(n)).slice(0, 5);
    line("Gemini", r.ok, r.ok ? `flash models: ${flash.join(", ") || "none listed"}` : `HTTP ${r.status}`);
  } catch (e) { line("Gemini", false, e.message); }
}

if (has("RESEND_API_KEY")) {
  try {
    const r = await fetch("https://api.resend.com/domains", { headers: { Authorization: `Bearer ${env.RESEND_API_KEY}` } });
    line("Resend", r.ok || r.status === 401 ? r.ok : false, `HTTP ${r.status}${r.status === 401 ? " (a send-only key returns 401 here; that can still be valid)" : ""}`);
  } catch (e) { line("Resend", false, e.message); }
}
