import { timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { runDispatch } from "@/lib/notify/dispatch";
import { createServiceClient } from "@/lib/supabase/service";

function authorised(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret || secret.length < 16) return false; // never run unauthenticated when the secret is missing
  const given = request.headers.get("authorization") ?? "";
  const expected = `Bearer ${secret}`;
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

async function handle(request: NextRequest) {
  if (!authorised(request)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const dryRun = request.nextUrl.searchParams.get("dry") === "1";
  const stats = await runDispatch(createServiceClient(), { dryRun });
  const { plan, ...summary } = stats;
  return NextResponse.json({ ok: true, dryRun, ...summary, planned_alerts: plan.length });
}

export const GET = handle;
export const POST = handle;
