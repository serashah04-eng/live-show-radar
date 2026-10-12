// Searches upcoming shows for EVERY followed artist that has not been searched yet (Google first, OpenRouter fallback).
// Run: node --env-file=.env.local scripts/search-followed.mjs [--parallel=3]
import { createClient } from "@supabase/supabase-js";
import { searchArtistNow } from "../src/lib/discovery/on-demand.ts";
const parallel = Number(process.argv.find((a) => a.startsWith("--parallel="))?.split("=")[1] ?? 3);
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SECRET_KEY, { auth: { persistSession: false } });
const { data: f } = await db.from("user_artist_follows").select("artist_id");
const ids = [...new Set((f ?? []).map((x) => x.artist_id))];
const { data: arts } = await db.from("artists").select("id, name").in("id", ids);
let i = 0, created = 0;
await Promise.all(Array.from({ length: parallel }, async () => {
  while (i < arts.length) {
    const a = arts[i++];
    try {
      const r = await searchArtistNow(db, a.id, { geminiApiKey: process.env.GEMINI_API_KEY, geminiModel: process.env.GEMINI_MODEL || "gemini-flash-latest", ticketmasterKey: process.env.TICKETMASTER_API_KEY, mode: "upcoming", force: true, budgetMs: 150_000 });
      created += r.created;
      console.log(a.name.padEnd(24), r.status.padEnd(10), "found", r.found, "new", r.created);
    } catch (e) { console.log(a.name, "threw", String(e.message).slice(0, 80)); }
  }
}));
console.log("followed artists searched:", arts.length, "new events:", created);
