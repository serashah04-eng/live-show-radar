import { Suspense } from "react";
import { ArtistPicker } from "@/components/ArtistPicker";
import { requireUser } from "@/lib/auth";
import { FindShows } from "@/components/FindShows";
import { loadGenres, loadPendingSearches, loadPrefs } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";
import { AddArtistForm } from "./AddArtistForm";

// Following an artist starts a background search, and Find shows runs one per artist from here.
export const maxDuration = 300;

export default function ArtistsPage() {
  return (
    <>
      <p className="mono">Artists</p>
      <h1 className="mt-1 text-4xl sm:text-6xl">Tap to follow</h1>
      <p className="mt-2 max-w-2xl muted">
        Every tap saves instantly. Following is separate from genres: followed artists stay in your feed even when their genre isn&apos;t selected.
      </p>
      <Suspense fallback={<p className="mt-6 muted" role="status">Loading artists…</p>}>
        <Artists />
      </Suspense>
    </>
  );
}

async function Artists() {
  const user = await requireUser();
  const sb = await createClient();
  const [{ data: artists }, { prefs }, genres] = await Promise.all([
    sb.from("artists").select("id, name, origin, artist_genres(genres(slug))").order("name"),
    loadPrefs(sb, user.id),
    loadGenres(sb),
  ]);
  const list = (artists ?? []).map((a) => ({
    id: a.id as string,
    name: a.name as string,
    origin: (a.origin as string | null) ?? null,
    genres: (a.artist_genres as unknown as { genres: { slug: string } | null }[]).map((g) => g.genres?.slug).filter((s): s is string => Boolean(s)),
  }));
  const pending = await loadPendingSearches(sb, prefs.followedArtistIds);
  return (
    <div className="mt-6 space-y-10">
      <FindShows pending={pending} followedCount={prefs.followedArtistIds.length} />
      <ArtistPicker artists={list} genres={genres} initialFollowed={prefs.followedArtistIds} mode="live" myGenres={prefs.allGenres ? [] : prefs.genreSlugs} />
      <details className="card">
        <summary className="cursor-pointer text-lg font-bold">Can&apos;t find an artist? Add them</summary>
        <div className="mt-4"><AddArtistForm genres={genres} /></div>
      </details>
    </div>
  );
}
