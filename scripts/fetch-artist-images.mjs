// Finds a profile photo for each artist from Wikipedia (free API, no key; images are Wikimedia Commons files).
// Only accepts a page whose title matches the artist name, so a wrong person is never shown. Misses stay empty
// (the app shows a monogram). Run: node --env-file=.env.local scripts/fetch-artist-images.mjs
import { writeFileSync, readFileSync, existsSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import { normalizeName } from "../src/lib/discovery/normalize.ts";

const OUT = "src/lib/catalog/artist-images.json";
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SECRET_KEY, { auth: { persistSession: false } });
const { data: rows } = await db.from("artists").select("name, normalized_name");
const have = existsSync(OUT) ? JSON.parse(readFileSync(OUT, "utf8")) : {};
const UA = { "User-Agent": "FrontRow/1.0 (concert alerts demo; contact via GitHub)" };
const tokens = (s) => normalizeName(s).split(" ").filter(Boolean);
const titleOk = (title, name) => {
  const t = tokens(title.replace(/\(.*?\)/g, ""));
  const n = tokens(name);
  return n.length > 0 && n.every((x) => t.includes(x)) && t.length <= n.length + 1;
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let hit = 0, miss = 0;
for (const r of rows ?? []) {
  const key = r.normalized_name;
  if (have[key]) { hit++; continue; }
  let found = null;
  for (const q of [`${r.name} musician`, `${r.name} band`, r.name]) {
    const url = `https://en.wikipedia.org/w/api.php?action=query&format=json&generator=search&gsrsearch=${encodeURIComponent(q)}&gsrlimit=3&prop=pageimages&piprop=thumbnail&pithumbsize=480&origin=*`;
    try {
      let j = null;
      for (let t = 0; t < 4 && !j; t++) {
        const res = await fetch(url, { headers: UA });
        const txt = await res.text();
        try { j = JSON.parse(txt); } catch { await sleep(6000 * (t + 1)); }
      }
      if (!j) continue;
      const pages = Object.values(j?.query?.pages ?? {}).sort((a, b) => a.index - b.index);
      const p = pages.find((x) => x.thumbnail?.source && titleOk(x.title, r.name));
      if (p) { found = { url: p.thumbnail.source, page: `https://en.wikipedia.org/wiki/${encodeURIComponent(p.title.replace(/ /g, "_"))}` }; break; }
    } catch { /* try next query */ }
    await sleep(450);
  }
  if (found) { have[key] = found; hit++; } else miss++;
  await sleep(450);
}
writeFileSync(OUT, JSON.stringify(have, null, 1));
console.log(`photos found: ${hit}, none: ${miss}, artists: ${rows?.length}`);
