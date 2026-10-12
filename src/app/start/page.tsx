import { Suspense } from "react";
import { requireUser } from "@/lib/auth";
import { loadGenres, loadPrefs } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";
import { Wizard } from "./Wizard";

export default function StartPage() {
  return (
    <Suspense fallback={<p className="muted" role="status">Loading…</p>}>
      <Start />
    </Suspense>
  );
}

async function Start() {
  const user = await requireUser();
  const sb = await createClient();
  const [{ prefs }, genres, { data: artists }] = await Promise.all([
    loadPrefs(sb, user.id),
    loadGenres(sb),
    sb.from("artists").select("id, name, origin, artist_genres(genres(slug))").order("name"),
  ]);
  const list = (artists ?? []).map((a) => ({
    id: a.id as string,
    name: a.name as string,
    origin: (a.origin as string | null) ?? null,
    genres: (a.artist_genres as unknown as { genres: { slug: string } | null }[]).map((g) => g.genres?.slug).filter((s): s is string => Boolean(s)),
  }));
  return (
    <Wizard
      genres={genres}
      artists={list}
      initial={{ allGenres: prefs.allGenres, genreSlugs: prefs.genreSlugs, cities: prefs.cities, followed: prefs.followedArtistIds }}
    />
  );
}
