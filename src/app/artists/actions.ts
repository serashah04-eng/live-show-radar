"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { searchArtistNow } from "@/lib/discovery/on-demand";
import { requireUser } from "@/lib/auth";
import { normalizeName } from "@/lib/discovery/normalize";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

export async function toggleFollow(formData: FormData) {
  const user = await requireUser();
  const artistId = String(formData.get("artistId") ?? "");
  const follow = formData.get("follow") === "1";
  if (!/^[0-9a-f-]{36}$/i.test(artistId)) return;
  const sb = await createClient(); // RLS: users can only touch their own follows
  if (follow) await sb.from("user_artist_follows").upsert({ user_id: user.id, artist_id: artistId });
  else await sb.from("user_artist_follows").delete().eq("user_id", user.id).eq("artist_id", artistId);
  revalidatePath("/artists");
  revalidatePath("/feed");
  revalidatePath("/");
}

const UUID = /^[0-9a-f-]{36}$/i;

/** One tap on an artist tile. Returns ok:false so the tile can undo itself. */
export async function setFollow(artistId: string, follow: boolean): Promise<{ ok: boolean }> {
  const user = await requireUser();
  if (!UUID.test(artistId)) return { ok: false };
  const sb = await createClient(); // RLS: users can only touch their own follows
  const { error } = follow
    ? await sb.from("user_artist_follows").upsert({ user_id: user.id, artist_id: artistId })
    : await sb.from("user_artist_follows").delete().eq("user_id", user.id).eq("artist_id", artistId);
  if (error) return { ok: false };
  if (follow) searchSoon(artistId, user.id);
  revalidatePath("/feed");
  revalidatePath("/");
  return { ok: true };
}

/**
 * Following an artist starts a background search for their shows so the feed fills in without another click.
 * Guard: at most 6 searches in any 5 minutes, so rapid tapping cannot burn the quota. Anything skipped is
 * picked up by the Find shows button or the 30-minute scheduler.
 */
function searchSoon(artistId: string, userId: string) {
  const key = process.env.GEMINI_API_KEY;
  if (!key || process.env.AUTO_SEARCH_ON_FOLLOW === "false") return;
  after(async () => {
    try {
      const db = createServiceClient();
      const since = new Date(Date.now() - 5 * 60_000).toISOString();
      const { count } = await db.from("discovery_runs").select("*", { count: "exact", head: true }).eq("source_name", "gemini_grounding").gte("started_at", since);
      if ((count ?? 0) >= 6) return;
      const { data: up } = await db.from("user_preferences").select("cities").eq("user_id", userId).maybeSingle();
      await searchArtistNow(db, artistId, {
        geminiApiKey: key,
        geminiModel: process.env.GEMINI_MODEL || "gemini-flash-latest",
        ticketmasterKey: process.env.TICKETMASTER_API_KEY || undefined,
        cities: (up?.cities as string[] | undefined) ?? undefined,
      });
    } catch (e) {
      console.error("background search after follow failed:", e instanceof Error ? e.message : e);
    }
  });
}

/** "Select all shown" / "Clear shown" for the artists currently on screen. */
export async function setFollowMany(artistIds: string[], follow: boolean): Promise<{ ok: boolean }> {
  const user = await requireUser();
  const ids = [...new Set(artistIds)].filter((i) => UUID.test(i)).slice(0, 300);
  if (ids.length === 0) return { ok: true };
  const sb = await createClient();
  const { error } = follow
    ? await sb.from("user_artist_follows").upsert(ids.map((artist_id) => ({ user_id: user.id, artist_id })))
    : await sb.from("user_artist_follows").delete().eq("user_id", user.id).in("artist_id", ids);
  if (error) return { ok: false };
  revalidatePath("/feed");
  revalidatePath("/");
  return { ok: true };
}

export interface AddArtistState {
  error?: string;
  message?: string;
}

export async function addArtist(_prev: AddArtistState, formData: FormData): Promise<AddArtistState> {
  const user = await requireUser();
  const name = String(formData.get("name") ?? "").trim().replace(/\s+/g, " ");
  const origin = String(formData.get("origin") ?? "other");
  const aliasesRaw = String(formData.get("aliases") ?? "");
  const genreIds = formData.getAll("genres").map((g) => Number(g)).filter((n) => Number.isInteger(n));
  if (name.length < 2 || name.length > 80) return { error: "Enter the artist's name (2 to 80 characters)." };
  if (!["indian_indie", "bollywood", "international", "other"].includes(origin)) return { error: "Choose a valid artist type." };

  const norm = normalizeName(name);
  if (!norm) return { error: "That name has no usable letters." };
  const db = createServiceClient(); // shared catalogue is written server-side only
  const { data: dup } = await db.from("artists").select("id").eq("normalized_name", norm).maybeSingle();
  if (dup) return { error: `${name} is already in the catalogue. Search for them and tap Follow.` };

  const { data: artist, error } = await db.from("artists").insert({ name, normalized_name: norm, origin }).select("id").single();
  if (error) return { error: "Could not add the artist. Please try again." };

  const aliases = [...new Set([name, ...aliasesRaw.split(",").map((a) => a.trim()).filter(Boolean)].slice(0, 12))];
  await db.from("artist_aliases").upsert(
    aliases.map((alias) => ({ artist_id: artist.id, alias, normalized_alias: normalizeName(alias) })).filter((a) => a.normalized_alias),
    { onConflict: "artist_id,normalized_alias" },
  );
  if (genreIds.length) await db.from("artist_genres").insert(genreIds.map((genre_id) => ({ artist_id: artist.id, genre_id })));
  await db.from("user_artist_follows").upsert({ user_id: user.id, artist_id: artist.id });

  revalidatePath("/artists");
  revalidatePath("/feed");
  return { message: `${name} added and followed. The next discovery run will start looking for their shows.` };
}
