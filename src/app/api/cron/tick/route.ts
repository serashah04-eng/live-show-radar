import { NextResponse } from "next/server";
import { runMonitor, sweepStale } from "@/lib/monitor/run";
import { runDispatch } from "@/lib/notify/dispatch";
import { createServiceClient } from "@/lib/supabase/service";

// One 30-minute cycle: poll the credible sources, sweep stale shows, send alerts.
// No secret is needed (so the GitHub workflow needs none), but the work is rate-limited: at most one run per 25 minutes,
// whoever calls it. Extra calls return "skipped" without spending any AI credit.
export const maxDuration = 300;
const MIN_GAP_MS = 25 * 60_000;

async function handle() {
  const db = createServiceClient();
  const { data: last } = await db.from("monitor_state").select("updated_at").eq("key", "tick").maybeSingle();
  if (last && Date.now() - Date.parse(last.updated_at as string) < MIN_GAP_MS) {
    const wait = Math.ceil((MIN_GAP_MS - (Date.now() - Date.parse(last.updated_at as string))) / 60000);
    return NextResponse.json({ ok: true, skipped: "ran recently", next_run_possible_in_minutes: wait });
  }
  await db.from("monitor_state").upsert({ key: "tick", value: "running", updated_at: new Date().toISOString() });

  const out: Record<string, unknown> = { ok: true };
  try {
    const m = await runMonitor(db, {
      geminiApiKey: process.env.GEMINI_API_KEY ?? "",
      geminiModel: process.env.GEMINI_MODEL || "gemini-flash-latest",
      maxSources: 6, maxItemsPerSource: 6, maxAiPerRun: 6, budgetMs: 150_000,
    });
    const { perSource, ...rest } = m;
    out.monitor = { ...rest, sources: perSource.length };
  } catch (e) {
    out.monitor = { error: String((e as Error).message).slice(0, 160) };
  }
  try {
    out.swept_stale = await sweepStale(db);
  } catch (e) {
    out.swept_stale = { error: String((e as Error).message).slice(0, 160) };
  }
  try {
    const { plan, ...d } = await runDispatch(db, {});
    out.alerts = { ...d, planned: plan.length };
  } catch (e) {
    out.alerts = { error: String((e as Error).message).slice(0, 160) };
  }
  await db.from("monitor_state").upsert({ key: "tick", value: "done", updated_at: new Date().toISOString() });
  return NextResponse.json(out);
}

export const GET = handle;
export const POST = handle;
