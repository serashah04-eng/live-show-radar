// Catalogue integrity. Run: node --test scripts/catalog.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import { ARTIST_CATALOG } from "../src/lib/catalog/artists.ts";
import { GENRES } from "../src/lib/catalog/genres.ts";
import { ALL_INDIA_CITIES, INDIA_REGIONS, DEFAULT_CITY } from "../src/lib/catalog/cities.ts";
import { normalizeName } from "../src/lib/discovery/normalize.ts";

test("every artist is well formed and unique after normalisation", () => {
  const seen = new Set();
  for (const a of ARTIST_CATALOG) {
    assert.ok(a.name.length >= 2, a.name);
    assert.ok(["indian_indie", "bollywood", "international", "other"].includes(a.origin), `${a.name}: origin`);
    assert.ok(a.genres.length >= 1, `${a.name}: needs a genre`);
    const n = normalizeName(a.name);
    assert.ok(n, a.name);
    assert.ok(!seen.has(n), `duplicate artist ${a.name}`);
    seen.add(n);
  }
  assert.ok(ARTIST_CATALOG.length >= 150);
});

test("artist genres all exist in the genre list; genre slugs are unique", () => {
  const slugs = new Set(GENRES.map((g) => g.slug));
  assert.equal(slugs.size, GENRES.length);
  for (const a of ARTIST_CATALOG) for (const g of a.genres) assert.ok(slugs.has(g), `${a.name}: unknown genre ${g}`);
});

test("no alias collides with a different artist's name or alias", () => {
  const owner = new Map();
  for (const a of ARTIST_CATALOG)
    for (const k of [a.name, ...a.aliases].map(normalizeName)) {
      assert.ok(!owner.has(k) || owner.get(k) === a.name, `alias/name "${k}" belongs to both ${owner.get(k)} and ${a.name}`);
      owner.set(k, a.name);
    }
});

test("cities: unique, grouped, include Bengaluru and the major metros", () => {
  assert.equal(new Set(ALL_INDIA_CITIES).size, ALL_INDIA_CITIES.length);
  assert.ok(INDIA_REGIONS.length >= 6);
  for (const c of [DEFAULT_CITY, "Mumbai", "Delhi", "Chennai", "Kolkata", "Hyderabad", "Pune", "Goa", "Shillong"]) assert.ok(ALL_INDIA_CITIES.includes(c), c);
  assert.ok(ALL_INDIA_CITIES.length >= 90);
});
