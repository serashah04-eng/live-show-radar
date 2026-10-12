// Loads the monitorable, VERIFIED, tier 1-2 sources from research/sources.json into the `sources` table.
// Only feeds/sitemaps with a real URL are loaded; sources that forbid RSS or could not be verified are skipped.
// Run: node --env-file=.env.local scripts/seed-sources.mjs
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SECRET_KEY, { auth: { persistSession: false } });
const reg = JSON.parse(readFileSync("research/sources.json", "utf8"));
const urlIn = (s) => String(s ?? "").match(/https?:\/\/[^\s)]+/)?.[0] ?? null;
const SKIP = [/songkick\.com/]; // huge tier-3 sitemap, not a source of truth

const rows = [];
for (const e of reg) {
  if (e.status !== "verified" || e.credibility_tier > 2 || !e.root_url) continue;
  const feed = urlIn(e.feed_url);
  if (!feed || SKIP.some((r) => r.test(feed))) continue;
  if (/disallow/i.test(String(e.feed_url))) continue; // the site's own robots.txt forbids it
  const kind = /sitemap/i.test(feed) ? "sitemap" : /rss|feed|atom|\.xml/i.test(feed) ? "rss" : null;
  if (!kind) continue;
  rows.push({
    name: e.name, category: e.category, root_url: e.root_url, tier: e.credibility_tier, status: "verified", kind, feed_url: feed, active: true,
    notes: { automation_notes: e.automation_notes ?? null, evidence: (e.evidence ?? []).slice(0, 3), seeded_from: "research/sources.json" },
  });
}
const { error } = await db.from("sources").upsert(rows, { onConflict: "root_url" });
if (error) { console.error("seed failed:", error.message); process.exit(1); }
const { count } = await db.from("sources").select("*", { count: "exact", head: true });
console.log(`seeded ${rows.length} monitorable sources (registry now has ${count}):`);
for (const r of rows) console.log(` - T${r.tier} ${r.kind.padEnd(7)} ${r.name} -> ${r.feed_url}`);
