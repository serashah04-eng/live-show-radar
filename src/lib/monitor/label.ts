// STEP 3 of detection: how credible is what we found? Pure functions, fully unit tested.

export type Label = "confirmed" | "likely" | "unverified";

export interface SourceEvidence {
  name: string;
  /** registrable domain, e.g. "district.in" (used to decide whether two sources are independent). */
  domain: string;
  /** 1 = official primary source, 2 = trade/news, 3 = discovery lead, 0/undefined = unknown source. */
  tier: number;
  url: string;
  publishedAt?: string | null;
  facts?: { date?: string | null; venue?: string | null; city?: string | null; price?: string | null };
}

export const UNVERIFIED_WARNING = "Non-credible or unverified source. Please check the official ticketer or promoter before acting.";
export const LIKELY_NOTE = "Awaiting official confirmation.";

export interface Classification {
  label: Label;
  /** best (lowest) tier among the sources; 99 when none are known. */
  bestTier: number;
  confirmedBy: string | null;
  note: string | null;
  warning: string | null;
  conflicts: Conflict[];
}

export interface Conflict {
  field: "date" | "venue" | "price";
  values: { source: string; value: string }[];
}

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
const tierOf = (s: SourceEvidence) => (s.tier >= 1 && s.tier <= 3 ? s.tier : 99);

/** Facts that disagree across sources. Shown to the user instead of picking one. */
export function findConflicts(sources: SourceEvidence[]): Conflict[] {
  const out: Conflict[] = [];
  for (const field of ["date", "venue", "price"] as const) {
    const seen = new Map<string, { source: string; value: string }>();
    for (const s of sources) {
      const v = s.facts?.[field];
      if (!v) continue;
      const key = field === "venue" ? norm(v).split(" ").filter((w) => w.length >= 3).sort().join(" ") : norm(v);
      if (!key) continue;
      if (field === "venue") {
        // venue spellings count as agreeing when they share any significant word
        const words = new Set(key.split(" "));
        const same = [...seen.keys()].some((k) => k.split(" ").some((w) => words.has(w)));
        if (!same || seen.size === 0) seen.set(key, { source: s.name, value: v });
      } else if (!seen.has(key)) seen.set(key, { source: s.name, value: v });
    }
    if (seen.size > 1) out.push({ field, values: [...seen.values()] });
  }
  return out;
}

/**
 * CONFIRMED: a tier-1 source, OR two independent tier-1/2 sources (different domains) agree.
 * LIKELY: exactly one tier-2 source and no official source yet (awaiting official confirmation).
 * UNVERIFIED: the best source is below tier 2 (or unknown). Still alert, with the warning attached.
 * Conflicting facts block CONFIRMED-by-agreement (two sources that disagree do not agree).
 */
export function classify(sources: SourceEvidence[]): Classification {
  const conflicts = findConflicts(sources);
  const bestTier = sources.length ? Math.min(...sources.map(tierOf)) : 99;
  const tier1 = sources.filter((s) => tierOf(s) === 1);
  const credible = sources.filter((s) => tierOf(s) <= 2);
  const credibleDomains = new Set(credible.map((s) => s.domain));
  const conflictOnKeyFacts = conflicts.some((c) => c.field === "date" || c.field === "venue");

  if (tier1.length > 0) return { label: "confirmed", bestTier, confirmedBy: tier1[0].name, note: null, warning: null, conflicts };
  if (credibleDomains.size >= 2 && !conflictOnKeyFacts) {
    return { label: "confirmed", bestTier, confirmedBy: credible.map((s) => s.name).slice(0, 2).join(" + "), note: null, warning: null, conflicts };
  }
  if (credible.length >= 1) return { label: "likely", bestTier, confirmedBy: null, note: LIKELY_NOTE, warning: null, conflicts };
  return { label: "unverified", bestTier, confirmedBy: null, note: null, warning: UNVERIFIED_WARNING, conflicts };
}

export type LabelChange = "none" | "upgrade" | "downgrade";
const rank: Record<Label, number> = { unverified: 0, likely: 1, confirmed: 2 };
export function labelChange(before: Label | null | undefined, after: Label): LabelChange {
  if (!before || before === after) return "none";
  return rank[after] > rank[before] ? "upgrade" : "downgrade";
}

export const labelText = (l: Label) => (l === "confirmed" ? "CONFIRMED" : l === "likely" ? "LIKELY" : "UNVERIFIED");
