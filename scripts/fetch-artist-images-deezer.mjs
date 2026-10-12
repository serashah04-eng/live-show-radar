// Artist photos from Deezer's public API (no key). A photo is accepted only when Deezer's artist name equals ours.
// Merges into src/lib/catalog/artist-images.json (existing Wikipedia entries are kept). Run: node --env-file=.env.local scripts/fetch-artist-images-deezer.mjs
import { writeFileSync, readFileSync, existsSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import { normalizeName } from "../src/lib/discovery/normalize.ts";

const OUT = "src/lib/catalog/artist-images.json";
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SECRET_KEY, { auth: { persistSession: false } });
const { data: rows } = await db.from("artists").select("name, normalized_name");
const have = existsSync(OUT) ? JSON.parse(readFileSync(OUT, "utf8")) : {};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let added = 0, none = 0;
for (const r of rows ?? []) {
  if (have[r.normalized_name]) continue;
  try {
    const j = await (await fetch(`https://api.deezer.com/search/artist?limit=5&q=${encodeURIComponent(r.name)}`)).json();
    const hit = (j.data ?? []).find((a) => normalizeName(a.name) === r.normalized_name && a.picture_xl && !/\/artist\/\/|default/.test(a.picture_xl));
    if (hit) { have[r.normalized_name] = { url: hit.picture_big || hit.picture_xl, page: hit.link, source: "deezer" }; added++; } else none++;
  } catch { none++; }
  await sleep(150);
}
writeFileSync(OUT, JSON.stringify(have, null, 1));
console.log(`deezer photos added: ${added}, none: ${none}, total with photo: ${Object.keys(have).length} of ${rows?.length}`);
