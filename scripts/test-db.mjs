// Verifies schema + RLS. Never prints secrets.
// Run: node --env-file=.env.local scripts/test-db.mjs
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const admin = createClient(url, process.env.SUPABASE_SECRET_KEY, { auth: { persistSession: false } });
const anon = createClient(url, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, { auth: { persistSession: false } });

const tables = ["profiles","genres","artists","artist_aliases","artist_genres","user_preferences","user_genres",
  "user_artist_follows","notification_preferences","events","event_artists","event_sources","event_evidence",
  "ticket_phases","notification_log","discovery_runs"];

let fails = 0;
const check = (name, ok, note = "") => { if (!ok) fails++; console.log(`${ok ? "PASS" : "FAIL"} ${name}${note ? " - " + note : ""}`); };

console.log("== Service role (server) ==");
for (const t of tables) {
  const { count, error } = await admin.from(t).select("*", { count: "exact", head: true });
  check(`table ${t} exists`, !error, error ? error.message : `${count} rows`);
}
const { data: seeded } = await admin.from("artists").select("name, artist_aliases(alias)").order("name");
check("5 starter artists seeded", seeded?.length === 5, seeded?.map((a) => `${a.name}(${a.artist_aliases.length})`).join(", "));

console.log("\n== Signed-out browser key (RLS must expose nothing) ==");
for (const t of ["artists","events","user_preferences","notification_preferences","notification_log","profiles"]) {
  const { data, error } = await anon.from(t).select("*").limit(5);
  check(`anon cannot read ${t}`, !error && (data?.length ?? 0) === 0 || !!error, error ? "blocked: " + error.code : `${data.length} rows visible`);
}
const ins = await anon.from("artists").insert({ name: "x", normalized_name: "x" });
check("anon cannot insert artists", !!ins.error, ins.error?.code);

console.log("\n== Constraints ==");
const badPhase = await admin.from("ticket_phases").insert({
  event_id: "00000000-0000-0000-0000-000000000000", phase: "early_bird", verification_status: "verified" });
check("verified phase without evidence rejected", !!badPhase.error, badPhase.error?.code);

console.log(fails ? `\n${fails} check(s) FAILED` : "\nAll checks passed");
process.exit(fails ? 1 : 0);
