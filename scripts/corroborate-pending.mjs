// Independent second search for pending events, then recompute corroboration.
// Run: node --env-file=.env.local scripts/corroborate-pending.mjs [--max=6]
import { createClient } from "@supabase/supabase-js";
import { corroborateEvent } from "../src/lib/discovery/corroborate.ts";
import { loadArtists } from "../src/lib/discovery/run.ts";

const max = Number(process.argv.find((a) => a.startsWith("--max="))?.split("=")[1] ?? 6);
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SECRET_KEY, { auth: { persistSession: false } });
const artists = await loadArtists(db);
const { data: pending } = await db
  .from("events")
  .select("id, title, city, event_sources(source_url)")
  .eq("verification_status", "pending_verification")
  .eq("corroborated", false)
  .limit(max);

for (const e of pending ?? []) {
  try {
    const r = await corroborateEvent(db, e.id, artists, { apiKey: process.env.GEMINI_API_KEY, model: process.env.GEMINI_MODEL || "gemini-flash-latest" });
    console.log(`${e.city ?? "?"} | ${e.title.slice(0, 40)} | sources ${r.sources} | corroborated: ${r.corroborated}`);
  } catch (err) {
    console.log(`${e.title.slice(0, 40)} | failed: ${String(err.message).slice(0, 120)}`);
  }
  await new Promise((r) => setTimeout(r, 5000));
}
