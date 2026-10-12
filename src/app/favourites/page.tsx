import Link from "next/link";
import { Suspense } from "react";
import { FindShows } from "@/components/FindShows";
import { MyArtists, type MyArtist } from "@/components/MyArtists";
import { isAdminUser, requireUser } from "@/lib/auth";
import { loadFeedEvents, loadGenres, loadPendingSearches, loadPrefs } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";

export const maxDuration = 300;

export default function MyArtistsPage() {
  return (
    <Suspense fallback={<p className="muted" role="status">Loading your collection…</p>}>
      <Collection />
    </Suspense>
  );
}

async function Collection() {
  const user = await requireUser();
  const sb = await createClient();
  const [{ data: artists }, { prefs }, genres, events] = await Promise.all([
    sb.from("artists").select("id, name, artist_genres(genres(slug))").order("name"),
    loadPrefs(sb, user.id),
    loadGenres(sb),
    loadFeedEvents(sb),
  ]);
  const genreName = new Map(genres.map((g) => [g.slug, g.name]));

  // the next upcoming India show for each favourite
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
  const mine: MyArtist[] = (artists ?? [])
    .filter((a) => prefs.followedArtistIds.includes(a.id as string))
    .map((a) => {
      const n = nextFor.get(a.id as string);
      return {
        id: a.id as string,
        name: a.name as string,
        genres: (a.artist_genres as unknown as { genres: { slug: string } | null }[]).map((g) => g.genres?.slug).filter((s): s is string => Boolean(s)).map((s) => genreName.get(s) ?? s),
        next: n ? { id: n.id, label: n.label } : null,
      };
    });
  const admin = await isAdminUser();
  const pending = admin ? await loadPendingSearches(sb, prefs.followedArtistIds) : [];

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-4xl sm:text-6xl">Favourites</h1>
          <p className="mt-2 muted">Your collection. Results and alerts are based on this list.</p>
        </div>
        <Link href="/artists" className="btn-primary">+ Add artists</Link>
      </div>
      <div className="mt-6 space-y-6">
        {admin && <FindShows pending={pending} followedCount={prefs.followedArtistIds.length} />}
        <MyArtists artists={mine} />
        {mine.length > 0 && !admin && <p className="text-sm muted" role="status">We watch these {mine.length} artists around the clock. You get an alert the moment a show is announced.</p>}
      </div>
    </>
  );
}
