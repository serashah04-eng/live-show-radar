// Fills the database with REAL, cited data: past India shows (history) and upcoming shows, via Gemini grounded search.
// Every record keeps its source link and starts as unverified. Nothing is invented; empty results stay empty.
// Run: node --env-file=.env.local scripts/fill-data.mjs [--minutes=13] [--parallel=4]
import { createClient } from "@supabase/supabase-js";
import { searchArtistNow } from "../src/lib/discovery/on-demand.ts";
import { normalizeName } from "../src/lib/discovery/normalize.ts";

const arg = (n, d) => Number(process.argv.find((a) => a.startsWith(`--${n}=`))?.split("=")[1] ?? d);
const budgetMs = arg("minutes", 13) * 60_000;
const parallel = arg("parallel", 4);
const started = Date.now();
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SECRET_KEY, { auth: { persistSession: false } });
const model = process.env.GEMINI_MODEL || "gemini-flash-latest";

const PAST = ["Anuv Jain", "Prateek Kuhad", "Arijit Singh", "Diljit Dosanjh", "AP Dhillon", "Karan Aujla", "Seedhe Maut", "Divine", "Raftaar", "Ritviz", "Nucleya", "Coldplay", "Ed Sheeran", "Martin Garrix", "Alan Walker", "Zedd", "When Chai Met Toast", "The Local Train", "Sid Sriram", "Badshah"];
const UPCOMING = ["Martin Garrix", "Alan Walker", "Zedd", "Nucleya", "Lost Stories", "Marshmello", "David Guetta", "Kygo", "Armin van Buuren", "Diplo", "Skrillex", "Calvin Harris", "Tiesto", "Afrojack", "Above & Beyond", "The Chainsmokers", "Swedish House Mafia", "Diljit Dosanjh", "AP Dhillon", "Karan Aujla", "Divine", "Arijit Singh", "Ritviz"];

const { data: rows } = await db.from("artists").select("id, normalized_name");
const idOf = new Map(rows.map((r) => [r.normalized_name, r.id]));
const tasks = [];
for (let i = 0; i < Math.max(PAST.length, UPCOMING.length); i++) {
  if (PAST[i]) tasks.push({ mode: "past", name: PAST[i] });
  if (UPCOMING[i]) tasks.push({ mode: "upcoming", name: UPCOMING[i] });
}

let next = 0;
const totals = { past: 0, upcoming: 0, tasks: 0, empty: 0, failed: 0 };
let quotaHit = false; // stop everything as soon as Google reports the search quota is used up
async function worker(w) {
  while (next < tasks.length && Date.now() - started < budgetMs && !quotaHit) {
    const t = tasks[next++];
    const id = idOf.get(normalizeName(t.name));
    if (!id) continue;
    try {
      const r = await searchArtistNow(db, id, {
        geminiApiKey: process.env.GEMINI_API_KEY, geminiModel: model, ticketmasterKey: t.mode === "upcoming" ? process.env.TICKETMASTER_API_KEY : undefined,
        mode: t.mode, sinceDate: "2025-01-01", force: true, budgetMs: 150_000,
      });
      totals.tasks++;
      if (r.error && /429|RESOURCE_EXHAUSTED/i.test(String(r.error))) { quotaHit = true; console.log("Google Search quota reached (HTTP 429). Stopping so no more calls are wasted."); }
      totals[t.mode] += r.created;
      if (r.status === "no_sources" || r.status === "failed") totals.failed++;
      else if (r.found === 0) totals.empty++;
      console.log(`[w${w}] ${t.mode.padEnd(8)} ${t.name.padEnd(22)} ${r.status.padEnd(10)} found ${r.found} new ${r.created}${r.error ? " err: " + String(r.error).slice(0, 80) : ""}  (${Math.round((Date.now() - started) / 1000)}s)`);
    } catch (e) {
      totals.failed++;
      console.log(`[w${w}] ${t.mode} ${t.name} threw: ${String(e.message).slice(0, 100)}`);
    }
    await new Promise((r) => setTimeout(r, 1500));
  }
}
await Promise.all(Array.from({ length: parallel }, (_, i) => worker(i + 1)));
const count = async (q) => (await q).count;
console.log("\nSUMMARY", JSON.stringify(totals), quotaHit ? "(stopped early: search quota reached)" : "");
console.log("events in database:", await count(db.from("events").select("*", { count: "exact", head: true })),
  "| past:", await count(db.from("events").select("*", { count: "exact", head: true }).lt("starts_at", new Date().toISOString())),
  "| sources:", await count(db.from("event_sources").select("*", { count: "exact", head: true })));
