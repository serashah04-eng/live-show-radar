// Runs discovery adapters against the real Supabase project.
// Run: node --env-file=.env.local scripts/run-discovery.mjs [--source=gemini|ticketmaster|all] [--artist="Anuv Jain"] [--dry]
import { createClient } from "@supabase/supabase-js";
import { loadArtists, runAdapter } from "../src/lib/discovery/run.ts";
import { createGeminiGroundingAdapter } from "../src/lib/discovery/sources/gemini-grounding.ts";
import { createTicketmasterAdapter } from "../src/lib/discovery/sources/ticketmaster.ts";

const arg = (n) => process.argv.find((a) => a.startsWith(`--${n}=`))?.split("=").slice(1).join("=");
const source = arg("source") ?? "all";
const only = arg("artist") ? [arg("artist")] : undefined;
const dryRun = process.argv.includes("--dry");

const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SECRET_KEY, { auth: { persistSession: false } });
const model = process.env.GEMINI_MODEL || "gemini-flash-latest";
const artists = await loadArtists(db, only);
const ctx = { artists, today: new Date() };
console.log(`artists: ${artists.map((a) => a.name).join(", ")}${dryRun ? "  (DRY RUN - nothing saved)" : ""}`);

const adapters = [];
if (source === "gemini" || source === "all")
  adapters.push(createGeminiGroundingAdapter({ apiKey: process.env.GEMINI_API_KEY, model, delayMs: 5000, onDebug: (l) => console.log("  debug:", l) }));
if (source === "ticketmaster" || source === "all")
  adapters.push(createTicketmasterAdapter({ apiKey: process.env.TICKETMASTER_API_KEY, delayMs: 300 }));

for (const a of adapters) {
  const r = await runAdapter(db, a, ctx, { geminiApiKey: process.env.GEMINI_API_KEY, geminiModel: model, dryRun });
  console.log(`\n[${r.source}] ${r.status} - found ${r.found}, new ${r.created}${r.error ? ", error: " + r.error : ""}`);
  for (const e of r.raw)
    console.log(`  - ${e.artistNames[0]} | ${e.city ?? "city?"} | ${e.dateText ?? e.dateBucket} | ${e.venue ?? "venue?"} | ${e.sourceTitle}`);
}
