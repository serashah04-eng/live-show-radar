// Re-evaluates conflict + corroboration flags for all pending events from stored sources.
// Run: node --env-file=.env.local scripts/recompute-corroboration.mjs
import { createClient } from "@supabase/supabase-js";
import { recomputeCorroboration } from "../src/lib/discovery/corroboration-core.ts";

const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SECRET_KEY, { auth: { persistSession: false } });
const { data: events } = await db.from("events").select("id, city, title").eq("verification_status", "pending_verification");
for (const e of events ?? []) {
  const ok = await recomputeCorroboration(db, e.id);
  console.log(`${e.city ?? "?"} | ${e.title.slice(0, 45)} | corroborated: ${ok}`);
}
