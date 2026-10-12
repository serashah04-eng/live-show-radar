import { randomUUID } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { ensureTrialAccount } from "@/lib/trial-auth";

// There is no sign-in page. A first-time visitor is given a private guest profile (no form, no password) so their
// favourites and alert settings are their own, then sent where they were going. Link-preview bots and crawlers get a
// plain page instead, so they never create profiles.
const BOT = /bot|crawl|spider|slurp|preview|facebookexternalhit|whatsapp|telegram|curl|wget|headless|lighthouse/i;

export async function GET(request: NextRequest) {
  if (BOT.test(request.headers.get("user-agent") ?? "")) {
    return new NextResponse("FrontRow: be first to every show in India.", { status: 200, headers: { "content-type": "text/plain; charset=utf-8" } });
  }
  const wanted = request.nextUrl.searchParams.get("next") ?? "/";
  const next = wanted.startsWith("/") && !wanted.startsWith("//") && !wanted.startsWith("/guest") ? wanted : "/";
  const origin = request.nextUrl.origin;
  const secret = process.env.SUPABASE_SECRET_KEY ?? "";
  if (!secret) return new NextResponse("FrontRow is not configured yet.", { status: 503 });

  const email = `guest-${randomUUID()}@frontrow-guest.app`;
  const account = await ensureTrialAccount(createServiceClient(), email, secret);
  if ("error" in account) {
    console.error(`guest profile failed: ${account.error}`);
    return new NextResponse("FrontRow could not start right now. Please refresh in a moment.", { status: 503 });
  }
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password: account.password });
  if (error) {
    console.error(`guest sign-in failed: ${error.message}`);
    return new NextResponse("FrontRow could not start right now. Please refresh in a moment.", { status: 503 });
  }
  return NextResponse.redirect(`${origin}${next === "/login" ? "/" : next}`);
}
