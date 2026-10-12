// Sets venue to null where the stored text is not a place ("TBA", "Stadium presentation"). Run: node --env-file=.env.local scripts/clean-venues.mjs
import { createClient } from "@supabase/supabase-js";
import { cleanVenue } from "../src/lib/feed.ts";
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SECRET_KEY, { auth: { persistSession: false } });
const { data } = await db.from("events").select("id, venue").not("venue", "is", null);
let n = 0;
for (const r of data) if (cleanVenue(r.venue) === null) { await db.from("events").update({ venue: null }).eq("id", r.id); n++; console.log("cleared:", r.venue); }
console.log("cleared", n);
