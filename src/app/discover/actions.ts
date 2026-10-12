"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { loadPrefs } from "@/lib/data";
import { searchArtistNow, type OnDemandResult } from "@/lib/discovery/on-demand";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

/** Finds shows for one artist the signed-in user follows. Called once per artist by the Find shows button. */
export async function discoverForArtist(artistId: string): Promise<OnDemandResult> {
  const user = await requireUser();
  const fail = (error: string): OnDemandResult => ({ artist: "", status: "failed", found: 0, created: 0, error });
  if (!/^[0-9a-f-]{36}$/i.test(artistId)) return fail("invalid artist");
  const key = process.env.GEMINI_API_KEY;
  if (!key) return fail("Search is not configured on the server (missing GEMINI_API_KEY).");

  const sb = await createClient();
  const { prefs } = await loadPrefs(sb, user.id);
  // Only artists the user follows can be searched, so nobody can burn the search quota on arbitrary names.
  if (!prefs.followedArtistIds.includes(artistId)) return fail("Follow this artist first.");

  const result = await searchArtistNow(createServiceClient(), artistId, {
    geminiApiKey: key,
    geminiModel: process.env.GEMINI_MODEL || "gemini-flash-latest",
    ticketmasterKey: process.env.TICKETMASTER_API_KEY || undefined,
    cities: prefs.cities,
  });
  revalidatePath("/feed");
  revalidatePath("/");
  return result;
}
