"use server";

import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { loadArtists } from "@/lib/discovery/run";
import { matchArtistsDeterministic } from "@/lib/discovery/match";
import { persistDiscovery } from "@/lib/discovery/persist";
import { manualToRaw } from "@/lib/discovery/sources/manual";
import { createServiceClient } from "@/lib/supabase/service";

export interface SubmitState {
  error?: string;
}

const clean = (v: FormDataEntryValue | null) => {
  const s = String(v ?? "").trim();
  return s ? s : null;
};

export async function submitEvent(_prev: SubmitState, formData: FormData): Promise<SubmitState> {
  await requireUser();
  const db = createServiceClient();
  let eventId: string | undefined;
  try {
    const raw = manualToRaw({
      url: String(formData.get("url") ?? "").trim(),
      artist: String(formData.get("artist") ?? ""),
      title: clean(formData.get("title")) ?? undefined,
      dateIso: clean(formData.get("date")),
      dateText: clean(formData.get("date")),
      venue: clean(formData.get("venue")),
      city: clean(formData.get("city")),
      note: clean(formData.get("note")),
    });
    const artists = await loadArtists(db);
    const matches = matchArtistsDeterministic(raw, artists);
    if (matches.length === 0) {
      return { error: `“${raw.artistNames[0]}” isn't in the artist catalogue yet. Add them in Artist Manager first so the event can be matched.` };
    }
    const res = await persistDiscovery(db, raw, matches, artists);
    eventId = res.eventId;
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Could not save the event." };
  }
  if (eventId) redirect(`/events/${eventId}`);
  return { error: "Could not save the event." };
}
