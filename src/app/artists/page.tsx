import { Suspense } from "react";
import { SubmitButton } from "@/components/SubmitButton";
import { requireUser } from "@/lib/auth";
import { loadGenres, loadPrefs } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";
import { AddArtistForm } from "./AddArtistForm";
import { toggleFollow } from "./actions";

type SP = Promise<Record<string, string | string[] | undefined>>;

export default function ArtistsPage({ searchParams }: { searchParams: SP }) {
  return (
    <>
      <h1 className="text-4xl sm:text-5xl">Artist manager</h1>
      <p className="mt-2 max-w-2xl muted">
        Follow the artists you care about. Following is separate from genres: followed artists stay in your feed even when their genre isn&apos;t selected.
      </p>
      <Suspense fallback={<p className="mt-6 muted" role="status">Loading artists…</p>}>
        <Artists searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function Artists({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const q = (Array.isArray(sp.q) ? sp.q[0] : sp.q)?.trim().toLowerCase() ?? "";
  const user = await requireUser();
  const sb = await createClient();
  const [{ data: artists }, { prefs }, genres] = await Promise.all([
    sb.from("artists").select("id, name, origin, artist_aliases(alias), artist_genres(genres(name))").order("name"),
    loadPrefs(sb, user.id),
    loadGenres(sb),
  ]);
  const followed = new Set(prefs.followedArtistIds);
  const list = (artists ?? []).filter((a) => {
    if (!q) return true;
    const hay = [a.name, ...(a.artist_aliases as { alias: string }[]).map((x) => x.alias)].join(" ").toLowerCase();
    return hay.includes(q);
  });

  return (
    <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_22rem]">
      <section>
        <form method="get" role="search" className="mb-4 flex gap-2">
          <label htmlFor="q" className="sr-only">Search artists or aliases</label>
          <input id="q" name="q" defaultValue={q} placeholder="Search artists or aliases" className="field" />
          <button className="btn-primary" type="submit">Search</button>
        </form>
        <p className="mb-3 text-sm muted">
          Following <strong className="text-offwhite">{followed.size}</strong> · {list.length} shown
        </p>
        {list.length === 0 ? (
          <div className="card">
            <p>No artist matches &ldquo;{q}&rdquo;.</p>
            <p className="mt-1 text-sm muted">Add them with the form so discovery can start looking for their shows.</p>
          </div>
        ) : (
          <ul className="space-y-3">
            {list.map((a) => {
              const isFollowed = followed.has(a.id);
              const aliasList = (a.artist_aliases as { alias: string }[]).map((x) => x.alias).filter((x) => x !== a.name);
              const genreNames = (a.artist_genres as unknown as { genres: { name: string } | null }[]).map((g) => g.genres?.name).filter(Boolean);
              return (
                <li key={a.id} className="card flex flex-wrap items-center justify-between gap-3 !p-4">
                  <div className="min-w-0">
                    <h3 className="text-xl">{a.name}</h3>
                    <p className="text-xs muted">
                      {genreNames.length ? genreNames.join(" · ") : "No genre metadata"}
                      {aliasList.length > 0 && <> · Also: {aliasList.join(", ")}</>}
                    </p>
                  </div>
                  <form action={toggleFollow}>
                    <input type="hidden" name="artistId" value={a.id} />
                    <input type="hidden" name="follow" value={isFollowed ? "0" : "1"} />
                    <SubmitButton className={isFollowed ? "btn-ghost" : "btn-primary"} pendingText="…">
                      {isFollowed ? <>Following<span className="sr-only">: unfollow {a.name}</span></> : <>Follow<span className="sr-only"> {a.name}</span></>}
                    </SubmitButton>
                  </form>
                </li>
              );
            })}
          </ul>
        )}
      </section>
      <AddArtistForm genres={genres} />
    </div>
  );
}
