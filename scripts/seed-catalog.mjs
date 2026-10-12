// Loads the full genre list and artist catalogue into Supabase. Idempotent: safe to run again.
// Existing artists keep their ids (and followers); aliases and genres are added, never removed.
// Run: node --env-file=.env.local scripts/seed-catalog.mjs
import { createClient } from "@supabase/supabase-js";
import { ARTIST_CATALOG } from "../src/lib/catalog/artists.ts";
import { GENRES } from "../src/lib/catalog/genres.ts";
import { normalizeName } from "../src/lib/discovery/normalize.ts";

const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SECRET_KEY, { auth: { persistSession: false } });
const must = (label, { error }) => { if (error) { console.error(`${label} failed: ${error.message}`); process.exit(1); } };

must("genres", await db.from("genres").upsert(GENRES, { onConflict: "slug" }));
const { data: genreRows } = await db.from("genres").select("id, slug");
const genreId = new Map(genreRows.map((g) => [g.slug, g.id]));

const artistRows = ARTIST_CATALOG.map((a) => ({ name: a.name, normalized_name: normalizeName(a.name), origin: a.origin }));
// ignoreDuplicates keeps existing rows (and their ids) untouched
must("artists", await db.from("artists").upsert(artistRows, { onConflict: "normalized_name", ignoreDuplicates: true }));
const { data: artists } = await db.from("artists").select("id, normalized_name");
const artistId = new Map(artists.map((a) => [a.normalized_name, a.id]));

const aliasRows = [];
const genreLinks = [];
for (const a of ARTIST_CATALOG) {
  const id = artistId.get(normalizeName(a.name));
  for (const alias of [a.name, ...a.aliases]) {
    const n = normalizeName(alias);
    if (n) aliasRows.push({ artist_id: id, alias, normalized_alias: n });
  }
  for (const g of a.genres) genreLinks.push({ artist_id: id, genre_id: genreId.get(g) });
}
must("aliases", await db.from("artist_aliases").upsert(aliasRows, { onConflict: "artist_id,normalized_alias", ignoreDuplicates: true }));
must("artist genres", await db.from("artist_genres").upsert(genreLinks, { onConflict: "artist_id,genre_id", ignoreDuplicates: true }));

const count = async (t) => (await db.from(t).select("*", { count: "exact", head: true })).count;
console.log(`catalogue loaded: ${await count("genres")} genres, ${await count("artists")} artists, ${await count("artist_aliases")} aliases, ${await count("artist_genres")} artist-genre links`);
