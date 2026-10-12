// Runs one monitor pass. Run: node --env-file=.env.local scripts/run-monitor.mjs [--dry] [--sources=6] [--items=8]
// --dry fetches and gates for real but saves nothing.
import { createClient } from "@supabase/supabase-js";
import { runMonitor } from "../src/lib/monitor/run.ts";

const arg = (n, d) => Number(process.argv.find((a) => a.startsWith(`--${n}=`))?.split("=")[1] ?? d);
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SECRET_KEY, { auth: { persistSession: false } });
const dry = process.argv.includes("--dry");
const s = await runMonitor(db, {
  geminiApiKey: process.env.GEMINI_API_KEY, geminiModel: process.env.GEMINI_MODEL || "gemini-flash-latest",
  maxSources: arg("sources", 6), maxItemsPerSource: arg("items", 8), maxAiPerRun: arg("ai", 10), dryRun: dry, log: (l) => console.log(l),
});
console.log(dry ? "\nDRY RUN (nothing saved)" : "\nSAVED", JSON.stringify({ ...s, perSource: undefined }));
for (const p of s.perSource) console.log(` - ${p.name.padEnd(28)} ${p.kind.padEnd(8)} ${p.status.padEnd(18)} seen ${p.seen} relevant ${p.relevant} new ${p.created}${p.error ? " (" + p.error + ")" : ""}`);
