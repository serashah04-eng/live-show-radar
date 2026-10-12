import type { AlertKind } from "./plan.ts";

export interface AlertContext {
  kind: AlertKind | "test";
  artists: string;
  title: string;
  venue: string | null;
  city: string | null;
  dateLabel: string; // already formatted, or "Date not announced"
  verified: boolean;
  corroborated: boolean;
  ticketUrl: string | null;
  sourceLinks: { url: string; label: string }[];
  eventUrl: string | null; // app link, only when APP_BASE_URL is a public https URL
  phase?: { name: string; endsLabel: string | null; evidenceUrl: string; excerpt: string | null; price: string | null };
  changeLabel?: string; // for status_change
}

export interface ComposedAlert {
  subject: string;
  telegramHtml: string;
  emailHtml: string;
  emailText: string;
}

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

function certainty(c: AlertContext): string {
  if (c.kind === "test") return "TEST ALERT. This is a sample message, not a real concert.";
  if (c.verified) return "Verified.";
  if (c.corroborated) return "Reported by 2+ websites. Not confirmed by an official source: check the links before you decide.";
  return "Unconfirmed. Check the links before you decide.";
}

export function composeAlert(c: AlertContext): ComposedAlert {
  const where = [c.venue, c.city].filter(Boolean).join(", ") || "Venue not announced";
  let headline: string;
  let subject: string;
  switch (c.kind) {
    case "early_bird_verified":
      headline = `EARLY BIRD: ${c.artists}`;
      subject = `Early bird open: ${c.artists}${c.city ? ` in ${c.city}` : ""}${c.phase?.endsLabel ? ` (ends ${c.phase.endsLabel})` : ""}`;
      break;
    case "deadline_reminder":
      headline = `DEADLINE SOON: ${c.artists}`;
      subject = `Deadline soon: ${c.artists}${c.phase?.endsLabel ? ` (${c.phase.endsLabel})` : ""}`;
      break;
    case "status_change":
      headline = `UPDATE: ${c.artists}`;
      subject = `Update: ${c.artists}: ${c.changeLabel ?? "details changed"}`;
      break;
    case "test":
      headline = "TEST: Live Show Radar";
      subject = "Live Show Radar test alert";
      break;
    default:
      headline = `NEW SHOW: ${c.artists}`;
      subject = `New show: ${c.artists}${c.city ? ` in ${c.city}` : ""}${c.verified ? "" : " (not confirmed)"}`;
  }

  const lines: string[] = [c.title, `Where: ${where}`, `When: ${c.dateLabel}`];
  if (c.changeLabel) lines.push(`Change: ${c.changeLabel}`);
  if (c.phase) {
    lines.push(`Ticket phase: ${c.phase.name}${c.phase.price ? ` (${c.phase.price})` : ""}`);
    if (c.phase.endsLabel) lines.push(`Ends: ${c.phase.endsLabel}`);
    lines.push(`Evidence: ${c.phase.evidenceUrl}`);
    if (c.phase.excerpt) lines.push(`Page says: "${c.phase.excerpt}"`);
  }
  lines.push(certainty(c));
  if (c.ticketUrl) lines.push(`Tickets: ${c.ticketUrl}`);
  for (const s of c.sourceLinks.slice(0, 3)) lines.push(`Source (${s.label}): ${s.url}`);
  if (c.eventUrl) lines.push(`Details: ${c.eventUrl}`);
  lines.push("You decide whether to attend or buy.");

  const emailText = `${headline}\n\n${lines.join("\n")}`;
  const telegramHtml = `<b>${esc(headline)}</b>\n${lines.map(esc).join("\n")}`;
  const emailHtml = `<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;background:#151821;color:#f4f5f7;padding:24px;border-radius:12px">
<h2 style="margin:0 0 12px;color:${c.kind === "early_bird_verified" || c.kind === "deadline_reminder" ? "#ff7a30" : "#f4f5f7"}">${esc(headline)}</h2>
${lines.map((l) => `<p style="margin:6px 0;line-height:1.4">${esc(l)}</p>`).join("")}
</div>`;
  return { subject, telegramHtml, emailHtml, emailText };
}
