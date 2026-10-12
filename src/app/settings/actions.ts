"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { ALL_INDIA_CITIES } from "@/lib/catalog/cities";
import { createClient } from "@/lib/supabase/server";

export interface SettingsState {
  error?: string;
  saved?: string;
}

const bool = (f: FormData, k: string) => f.get(k) === "on";

export async function saveSettings(_prev: SettingsState, formData: FormData): Promise<SettingsState> {
  const user = await requireUser();
  const sb = await createClient(); // RLS: only this user's rows are writable

  const allGenres = bool(formData, "all_genres");
  const strict = bool(formData, "strict_genre_mode");
  const showOther = bool(formData, "show_other_cities");
  const genreIds = formData.getAll("genres").map(Number).filter((n) => Number.isInteger(n));

  const cities = [...new Set(formData.getAll("cities").map(String).filter((c) => ALL_INDIA_CITIES.includes(c)))];
  if (cities.length === 0) return { error: "Choose at least one priority city (Bengaluru is the default)." };

  const chatId = String(formData.get("telegram_chat_id") ?? "").trim();
  if (chatId && !/^-?\d{5,20}$/.test(chatId)) return { error: "Telegram chat ID must be a number (for example 123456789)." };
  const email = String(formData.get("email_address") ?? "").trim();
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: "Enter a valid email address for alerts." };

  const results = await Promise.all([
    sb.from("user_preferences").upsert({
      user_id: user.id,
      all_genres: allGenres,
      strict_genre_mode: strict,
      cities,
      show_other_indian_cities: showOther,
    }),
    sb.from("notification_preferences").upsert({
      user_id: user.id,
      telegram_enabled: bool(formData, "telegram_enabled"),
      telegram_chat_id: chatId || null,
      email_enabled: bool(formData, "email_enabled"),
      email_address: email || null,
      new_concert_alerts: bool(formData, "new_concert_alerts"),
      early_bird_alerts: bool(formData, "early_bird_alerts"),
      deadline_reminders: bool(formData, "deadline_reminders"),
    }),
    sb.from("user_genres").delete().eq("user_id", user.id),
  ]);
  const failed = results.find((r) => r.error);
  if (failed?.error) return { error: `Could not save: ${failed.error.message}` };
  if (genreIds.length) {
    const { error } = await sb.from("user_genres").insert(genreIds.map((genre_id) => ({ user_id: user.id, genre_id })));
    if (error) return { error: `Could not save genres: ${error.message}` };
  }
  revalidatePath("/", "layout");
  return { saved: "Settings saved. Your feed and alerts now follow these preferences." };
}
