import registry from "../../../research/sources.json" with { type: "json" };

interface RegEntry {
  name: string;
  root_url: string | null;
  credibility_tier: number;
  status: string;
}

const TWO_PART = new Set(["co.in", "co.uk", "com.au", "org.in", "net.in", "ac.in", "gov.in", "nic.in"]);
export function registrableDomain(urlOrHost: string): string {
  let host = urlOrHost;
  try {
    host = new URL(urlOrHost).hostname;
  } catch {
    /* already a host */
  }
  const p = host.toLowerCase().replace(/^www\./, "").split(".");
  if (p.length <= 2) return p.join(".");
  const last2 = p.slice(-2).join(".");
  return TWO_PART.has(last2) ? p.slice(-3).join(".") : last2;
}

/**
 * Official ticketers, promoters and outlets the OWNER named as trusted in the source brief, even where a research
 * fetch was blocked (so they show "unverified" in sources.json). Tier follows the brief's own classification.
 */
const OWNER_TRUSTED: Record<string, { tier: number; name: string }> = {
  "bookmyshow.com": { tier: 1, name: "BookMyShow" },
  "district.in": { tier: 1, name: "District by Zomato" },
  "thumpn.com": { tier: 1, name: "thumpN" },
  "ticketgenie.in": { tier: 1, name: "TicketGenie" },
  "skillboxes.com": { tier: 1, name: "Skillbox" },
  "townscript.com": { tier: 1, name: "Townscript" },
  "teaminnovation.in": { tier: 1, name: "Team Innovation" },
  "oml.in": { tier: 1, name: "Only Much Louder" },
  "saregama.com": { tier: 1, name: "Saregama" },
  "sunburn.in": { tier: 1, name: "Sunburn" },
  "livefiesta.com": { tier: 2, name: "LiveFiesta" },
  "rollingstoneindia.com": { tier: 2, name: "Rolling Stone India" },
  "bandsintown.com": { tier: 3, name: "Bandsintown (discovery signal)" },
  "instagram.com": { tier: 3, name: "Instagram (social post)" },
};

const map = new Map<string, { tier: number; name: string }>();
for (const e of registry as RegEntry[]) {
  if (!e.root_url || e.status !== "verified") continue; // an unverified source never earns a tier
  const d = registrableDomain(e.root_url);
  const prev = map.get(d);
  if (!prev || e.credibility_tier < prev.tier) map.set(d, { tier: e.credibility_tier, name: e.name });
}
for (const [d, v] of Object.entries(OWNER_TRUSTED)) if (!map.has(d)) map.set(d, v);

/** tier 1-3, or 0 when the source is not in the vetted list. */
export function tierFor(url: string): { tier: number; name: string; domain: string } {
  const domain = registrableDomain(url);
  const hit = map.get(domain);
  return { tier: hit?.tier ?? 0, name: hit?.name ?? domain, domain };
}
