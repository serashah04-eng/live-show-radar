// Finds artists who have recently announced India tours, adds them, and searches their upcoming shows.
// Every show keeps its cited source and stays "unverified" until evidence says otherwise.
// Run: node --env-file=.env.local scripts/find-tours.mjs [--parallel=3]
import { createClient } from "@supabase/supabase-js";
import { searchWeb, generateJson, optsFromEnv } from "../src/lib/ai/llm.ts";
import { searchArtistNow } from "../src/lib/discovery/on-demand.ts";
import { normalizeName } from "../src/lib/discovery/normalize.ts";

const parallel = Number(process.argv.find((a) => a.startsWith("--parallel="))?.split("=")[1] ?? 3);
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SECRET_KEY, { auth: { persistSession: false } });
const llm = optsFromEnv();
const today = new Date().toISOString().slice(0, 10);

const QUERIES = [
  `Today is ${today}. Search the web: which international artists and DJs have announced concerts or tours in India for 2026 and 2027? List artist, cities and dates.`,
  `Today is ${today}. Search the web: which Indian singers, bands and rappers have announced India tours or big concerts for late 2026 and 2027 (for example Arijit Singh)? List artist, cities and dates.`,
  `Today is ${today}. Search the web for newly announced music festivals and concerts in India (Bengaluru, Mumbai, Delhi, Hyderabad, Pune, Chennai) for the next 12 months. List headliners.`,
];
const names = new Set(["Arijit Singh", "Fred again..", "Coldplay", "Ed Sheeran", "Dua Lipa", "Travis Scott", "Post Malone", "Karan Aujla", "Diljit Dosanjh"]);
for (const q of QUERIES) {
  try {
    const s = await searchWeb(q, llm);
    const j = JSON.parse(await generateJson(`Notes:\n"""\n${s.text}\n"""\nList the headlining ARTIST or BAND names that these notes say announced a concert/tour/festival set in India. JSON: {"artists":[string]}. Names only, only those in the notes, max 25.`, llm));
    for (const a of j.artists ?? []) if (typeof a === "string" && a.length < 60) names.add(a.trim());
    console.log(`query ok via ${s.provider}: ${(j.artists ?? []).length} names`);
  } catch (e) { console.log("query failed:", String(e.message).slice(0, 100)); }
}
console.log("artists to check:", [...names].join(", "));

const { data: rows } = await db.from("artists").select("id, normalized_name");
const idOf = new Map(rows.map((r) => [r.normalized_name, r.id]));
const list = [...names];
let next = 0, created = 0;
async function worker() {
  while (next < list.length) {
    const name = list[next++];
    const norm = normalizeName(name);
    let id = idOf.get(norm);
    if (!id) {
      const { data } = await db.from("artists").insert({ name, normalized_name: norm, origin: "other", metadata: { added_by: "find_tours" } }).select("id").single();
      id = data?.id;
      if (id) await db.from("artist_aliases").upsert({ artist_id: id, alias: name, normalized_alias: norm }, { onConflict: "artist_id,normalized_alias", ignoreDuplicates: true });
    }
    if (!id) continue;
    try {
      const r = await searchArtistNow(db, id, { geminiApiKey: process.env.GEMINI_API_KEY, geminiModel: process.env.GEMINI_MODEL || "gemini-flash-latest", mode: "upcoming", force: true, budgetMs: 150_000 });
      created += r.created;
      console.log(`${name.padEnd(24)} ${r.status.padEnd(10)} found ${r.found} new ${r.created}${r.error ? " err " + String(r.error).slice(0, 60) : ""}`);
    } catch (e) { console.log(name, "threw", String(e.message).slice(0, 80)); }
  }
}
await Promise.all(Array.from({ length: parallel }, worker));
console.log("new upcoming events:", created);
