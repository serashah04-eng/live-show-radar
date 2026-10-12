import type { DatePrecision } from "./types.ts";

export function normalizeName(s: string): string {
  return s
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

const CITY_ALIASES: Record<string, string> = {
  bangalore: "Bengaluru",
  bengaluru: "Bengaluru",
  bombay: "Mumbai",
  mumbai: "Mumbai",
  madras: "Chennai",
  chennai: "Chennai",
  calcutta: "Kolkata",
  kolkata: "Kolkata",
  gurgaon: "Gurugram",
  gurugram: "Gurugram",
  "new delhi": "Delhi",
  delhi: "Delhi",
  "delhi ncr": "Delhi",
  noida: "Noida",
  pune: "Pune",
  hyderabad: "Hyderabad",
  jaipur: "Jaipur",
  kochi: "Kochi",
  cochin: "Kochi",
  goa: "Goa",
  ahmedabad: "Ahmedabad",
};

export function normalizeCity(city: string | null | undefined): string | null {
  if (!city) return null;
  const key = normalizeName(city);
  if (!key || key === "unknown") return null;
  // "Sulthanpet / Bengaluru, Karnataka, India": prefer the first segment that is a known city
  const segments = city.split(/[,/|]/).map((s) => normalizeName(s)).filter(Boolean);
  for (const s of segments) if (CITY_ALIASES[s]) return CITY_ALIASES[s];
  if (CITY_ALIASES[key]) return CITY_ALIASES[key];
  // known city appearing as a whole word inside a longer string, e.g. "Bengaluru (Sulthanpet"
  const known = Object.keys(CITY_ALIASES).sort((a, b) => b.length - a.length);
  for (const k of known) if (` ${key} `.includes(` ${k} `)) return CITY_ALIASES[k];
  return city.split(/[,/|]/)[0].trim().replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Accepts only what a source actually states: YYYY-MM-DD, YYYY-MM or a full ISO timestamp. */
export function parseDateField(iso: string | null | undefined): {
  startsAt: string | null;
  precision: DatePrecision;
  bucket: string;
} {
  if (!iso) return { startsAt: null, precision: "unknown", bucket: "unknown" };
  const v = iso.trim();
  if (/^\d{4}-\d{2}-\d{2}T/.test(v)) {
    const d = new Date(v);
    if (!Number.isNaN(d.getTime())) return { startsAt: d.toISOString(), precision: "exact", bucket: v.slice(0, 10) };
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) {
    const d = new Date(`${v}T00:00:00+05:30`);
    if (!Number.isNaN(d.getTime())) return { startsAt: d.toISOString(), precision: "day", bucket: v };
  }
  if (/^\d{4}-\d{2}$/.test(v)) return { startsAt: null, precision: "month", bucket: v };
  return { startsAt: null, precision: "unknown", bucket: "unknown" };
}

export function dedupeKey(primaryArtist: string, city: string | null, bucket: string): string {
  return [normalizeName(primaryArtist), normalizeName(city ?? "unknown"), bucket].join("|");
}

/** True only when two venue names share no significant word (spelling variants are not conflicts). */
export function venuesDisagree(a: string | null, b: string | null): boolean {
  if (!a || !b) return false;
  const tokens = (s: string) => new Set(normalizeName(s).split(" ").filter((t) => t.length >= 3));
  const ta = tokens(a);
  const tb = tokens(b);
  if (!ta.size || !tb.size) return false;
  for (const t of ta) if (tb.has(t)) return false;
  return true;
}

export function isPast(startsAt: string | null, today: Date): boolean {
  return startsAt !== null && new Date(startsAt).getTime() < today.getTime() - 24 * 3600 * 1000;
}
