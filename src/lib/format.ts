import type { FeedEvent } from "@/lib/feed";

const tz = "Asia/Kolkata";

export function eventDateParts(e: Pick<FeedEvent, "starts_at" | "date_precision" | "date_text">) {
  if (e.starts_at && (e.date_precision === "exact" || e.date_precision === "day")) {
    const d = new Date(e.starts_at);
    return {
      day: d.toLocaleDateString("en-IN", { day: "2-digit", timeZone: tz }),
      month: d.toLocaleDateString("en-IN", { month: "short", timeZone: tz }).toUpperCase(),
      year: d.toLocaleDateString("en-IN", { year: "numeric", timeZone: tz }),
      full: d.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "long", year: "numeric", timeZone: tz }),
    };
  }
  return { day: "TBC", month: "", year: "", full: e.date_text ? `${e.date_text} (date not confirmed)` : "Date not announced" };
}

export function formatDateTime(iso: string | null) {
  if (!iso) return "Unknown";
  return new Date(iso).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: tz }) + " IST";
}

export function timeAgo(iso: string | null): string {
  if (!iso) return "never";
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 90) return "just now";
  if (s < 3600) return `${Math.round(s / 60)} min ago`;
  if (s < 86400) return `${Math.round(s / 3600)} h ago`;
  return `${Math.round(s / 86400)} d ago`;
}

export const TICKET_STATUS_LABEL: Record<string, string> = {
  upcoming: "Upcoming",
  tickets_available: "Tickets listed",
  early_bird_announced: "Early bird announced",
  early_bird_ending_soon: "Early bird ending soon",
  sold_out: "Sold out",
  unknown: "Ticket status unknown",
};

export const INDIAN_CITIES = [
  "Bengaluru", "Mumbai", "Delhi", "Chennai", "Hyderabad", "Pune", "Kolkata", "Gurugram", "Noida",
  "Jaipur", "Kochi", "Goa", "Ahmedabad", "Chandigarh", "Lucknow", "Indore", "Bhubaneswar", "Shillong",
];
