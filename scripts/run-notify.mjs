// Runs one alert cycle. Run: node --env-file=.env.local scripts/run-notify.mjs [--dry]
// --dry prints what would be sent and sends nothing.
import { createClient } from "@supabase/supabase-js";
import { runDispatch } from "../src/lib/notify/dispatch.ts";

const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SECRET_KEY, { auth: { persistSession: false } });
const dryRun = process.argv.includes("--dry");
const { plan, ...stats } = await runDispatch(db, { dryRun });
console.log(dryRun ? "DRY RUN (nothing sent)" : "SENT RUN", JSON.stringify(stats));
for (const p of plan) console.log(` - ${p.kind.padEnd(20)} ${p.dedupeKey.padEnd(52)} -> ${p.channels.map((c) => c.channel).join("+")}`);
