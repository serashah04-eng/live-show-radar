import Link from "next/link";
import { Suspense } from "react";
import { ArtistPicker } from "@/components/ArtistPicker";
import { FindShows } from "@/components/FindShows";
import { MyArtists, type MyArtist } from "@/components/MyArtists";
import { isAdminUser, requireUser } from "@/lib/auth";
import { loadFeedEvents, loadGenres, loadPendingSearches, loadPrefs } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";
import { AddArtistForm } from "./AddArtistForm";

// Following an artist starts a background search, and Find shows (owner only) runs one per artist from here.
export const maxDuration = 300;

export default function ArtistsPage({ searchParams }: { searchParams: Promise<{ add?: string }> }) {
  return (
    <Suspense fallback={<p className="muted" role="status">Loading your artists…</p>}>
      <Artists searchParams={searchParams} />
    </Suspense>
  );
}

async function Artists({ searchParams }: { searchParams: Promise<{ add?: string }> }) {
  const adding = (await searchParams).add === "1";
  const user = await requireUser();
  const sb = await createClient();
  const [{ data: artists }, { prefs }, genres, events] = await Promise.all([
    sb.from("artists").select("id, name, origin, artist_genres(genres(slug))").order("name"),
    loadPrefs(sb, user.id),
    loadGenres(sb),
    loadFeedEvents(sb),
  ]);
  const genreName = new Map(genres.map((g) => [g.slug, g.name]));
  const list = (artists ?? []).map((a) => ({
    id: a.id as string,
    name: a.name as string,
    origin: (a.origin as string | null) ?? null,
    genres: (a.artist_genres as unknown as { genres: { slug: string } | null }[]).map((g) => g.genres?.slug).filter((s): s is string => Boolean(s)),
  }));

  if (adding) {
    return (
      <>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-4xl sm:text-6xl">Add artists</h1>
            <p className="mt-2 muted">Pick genres, tap photos to add. Each tap saves instantly.</p>
          </div>
          <Link href="/artists" className="btn-primary">Done</Link>
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

  // my artists: the next upcoming India show for each favourite
  const now = new Date().getTime();
  const nextFor = new Map<string, { id: string; label: string; t: number }>();
  for (const e of events) {
    if (e.is_sample || e.verification_status === "rejected" || e.verification_status === "stale") continue;
    const t = e.starts_at ? Date.parse(e.starts_at) : Number.MAX_SAFE_INTEGER;
    if (e.starts_at && t < now) continue;
    const label = `${e.starts_at ? new Date(e.starts_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Kolkata" }) : "date to be announced"}${e.city ? `, ${e.city}` : ""}`;
    for (const a of e.artists) {
      const cur = nextFor.get(a.id);
      if (!cur || t < cur.t) nextFor.set(a.id, { id: e.id, label, t });
    }
  }
  const mine: MyArtist[] = list
    .filter((a) => prefs.followedArtistIds.includes(a.id))
    .map((a) => ({ id: a.id, name: a.name, genres: a.genres.map((g) => genreName.get(g) ?? g), next: nextFor.get(a.id) ? { id: nextFor.get(a.id)!.id, label: nextFor.get(a.id)!.label } : null }));
  const admin = await isAdminUser();
  const pending = admin ? await loadPendingSearches(sb, prefs.followedArtistIds) : [];

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-4xl sm:text-6xl">My artists</h1>
          <p className="mt-2 muted">Your favourites. Results and alerts are based on this list.</p>
        </div>
        <Link href="/artists?add=1" className="btn-primary">+ Add artists</Link>
      </div>
      <div className="mt-6 space-y-6">
        {admin && <FindShows pending={pending} followedCount={prefs.followedArtistIds.length} />}
        <MyArtists artists={mine} />
        {mine.length > 0 && !admin && <p className="text-sm muted" role="status">We watch these {mine.length} artists around the clock. You get an alert the moment a show is announced.</p>}
      </div>
    </>
  );
}
