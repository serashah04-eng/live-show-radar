import Link from "next/link";
import { Suspense } from "react";
import { ArtistPicker } from "@/components/ArtistPicker";
import { requireUser } from "@/lib/auth";
import { loadGenres, loadPrefs } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";
import { AddArtistForm } from "./AddArtistForm";

// Following an artist starts a background search for their shows.
export const maxDuration = 300;

export default function ArtistsPage() {
  return (
    <Suspense fallback={<p className="muted" role="status">Loading artists…</p>}>
      <Browse />
    </Suspense>
  );
}

async function Browse() {
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
  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-4xl sm:text-6xl">Artists</h1>
          <p className="mt-2 muted">Pick genres, tap photos to add. Each tap saves to <Link href="/my-artists" className="text-lime underline underline-offset-2">My artists</Link>.</p>
        </div>
        <Link href="/my-artists" className="btn-primary">Go to My artists</Link>
      </div>
      <div className="mt-6 space-y-8">
        <ArtistPicker artists={list} genres={genres} initialFollowed={prefs.followedArtistIds} mode="live" />
        <details className="card">
          <summary className="cursor-pointer text-lg font-bold">Can&apos;t find an artist? Add them</summary>
          <div className="mt-4"><AddArtistForm genres={genres} /></div>
        </details>
      </div>
    </>
  );
}
