"use server";

import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { ALL_INDIA_CITIES } from "@/lib/catalog/cities";
import { createClient } from "@/lib/supabase/server";

export interface StartState {
  error?: string;
}

/** Saves the three quick choices (genres, cities, artists) in one go, then opens the dashboard. */
export async function saveOnboarding(_prev: StartState, formData: FormData): Promise<StartState> {
  const user = await requireUser();
  const sb = await createClient(); // RLS: only this user's rows are writable

  const allGenres = formData.get("all_genres") === "1";
  const genreIds = formData.getAll("genres").map(Number).filter((n) => Number.isInteger(n));
  const cities = [...new Set(formData.getAll("cities").map(String).filter((c) => ALL_INDIA_CITIES.includes(c)))];
  const artistIds = [...new Set(formData.getAll("artists").map(String).filter((a) => /^[0-9a-f-]{36}$/i.test(a)))].slice(0, 300);
  if (cities.length === 0) return { error: "Pick at least one city, or tap All India." };

  const prefs = await sb.from("user_preferences").upsert({
    user_id: user.id,
    all_genres: allGenres || genreIds.length === 0,
    strict_genre_mode: false,
    cities,
    show_other_indian_cities: true,
  });
  if (prefs.error) return { error: "Could not save your choices. Please try again." };

  await sb.from("user_genres").delete().eq("user_id", user.id);
  if (!allGenres && genreIds.length) await sb.from("user_genres").insert(genreIds.map((genre_id) => ({ user_id: user.id, genre_id })));

  await sb.from("user_artist_follows").delete().eq("user_id", user.id);
  if (artistIds.length) {
    const { error } = await sb.from("user_artist_follows").insert(artistIds.map((artist_id) => ({ user_id: user.id, artist_id })));
    if (error) return { error: "Could not save your artists. Please try again." };
  }
  redirect("/");
}
