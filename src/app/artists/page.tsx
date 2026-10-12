import { Suspense } from "react";
import { ArtistPicker } from "@/components/ArtistPicker";
import { isAdminUser, requireUser } from "@/lib/auth";
import { FindShows } from "@/components/FindShows";
import { loadGenres, loadPendingSearches, loadPrefs } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";
import { AddArtistForm } from "./AddArtistForm";

// Following an artist starts a background search, and Find shows runs one per artist from here.
export const maxDuration = 300;

export default function ArtistsPage() {
  return (
    <>
      <h1 className="text-4xl sm:text-6xl">Your artists</h1>
      <p className="mt-2 muted">Tap a photo to follow. It saves instantly.</p>
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
  const admin = await isAdminUser();
  const pending = admin ? await loadPendingSearches(sb, prefs.followedArtistIds) : [];
  return (
    <div className="mt-6 space-y-10">
      {admin ? (
        <FindShows pending={pending} followedCount={prefs.followedArtistIds.length} />
      ) : (
        prefs.followedArtistIds.length > 0 && <p className="text-sm muted" role="status">We are watching ${prefs.followedArtistIds.length} artist${prefs.followedArtistIds.length === 1 ? "" : "s"} for new India shows around the clock. You get an alert the moment one is announced.</p>
      )}
      <ArtistPicker artists={list} genres={genres} initialFollowed={prefs.followedArtistIds} mode="live" myGenres={prefs.allGenres ? [] : prefs.genreSlugs} />
      <details className="card">
        <summary className="cursor-pointer text-lg font-bold">Can&apos;t find an artist? Add them</summary>
        <div className="mt-4"><AddArtistForm genres={genres} /></div>
      </details>
    </div>
  );
}
