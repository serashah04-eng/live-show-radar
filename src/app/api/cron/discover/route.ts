import { timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { runDiscoveryCycle } from "@/lib/discovery/cycle";
import { createServiceClient } from "@/lib/supabase/service";

// Vercel allows long-running functions; this keeps one cycle inside a safe window.
export const maxDuration = 300;

function authorised(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret || secret.length < 16) return false; // never run unauthenticated when the secret is missing
  const given = Buffer.from(request.headers.get("authorization") ?? "");
  const expected = Buffer.from(`Bearer ${secret}`);
  return given.length === expected.length && timingSafeEqual(given, expected);
}

const intEnv = (name: string, fallback: number) => {
  const n = Number(process.env[name]);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback;
};

async function handle(request: NextRequest) {
  if (!authorised(request)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const key = process.env.GEMINI_API_KEY;
  if (!key) return NextResponse.json({ error: "GEMINI_API_KEY is not configured" }, { status: 500 });
  try {
    const summary = await runDiscoveryCycle(createServiceClient(), {
      artistsPerRun: intEnv("DISCOVERY_ARTISTS_PER_RUN", 1),
      corroborateMax: intEnv("DISCOVERY_CORROBORATE_PER_RUN", 1),
      budgetMs: 200_000,
      geminiApiKey: key,
      geminiModel: process.env.GEMINI_MODEL || "gemini-flash-latest",
      ticketmasterKey: process.env.TICKETMASTER_API_KEY || undefined,
      sendAlerts: process.env.NOTIFICATIONS_ENABLED !== "false",
    });
    return NextResponse.json({ ok: true, ...summary });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "cycle failed";
    return NextResponse.json({ ok: false, error: msg.replace(/key=[^&\s]+/gi, "key=***").slice(0, 300) }, { status: 500 });
  }
}

export const GET = handle;
export const POST = handle;
