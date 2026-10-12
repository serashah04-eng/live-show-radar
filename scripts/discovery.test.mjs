// Unit tests (no network). Run: node --test scripts/discovery.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import { normalizeName, normalizeCity, parseDateField, dedupeKey, isPast } from "../src/lib/discovery/normalize.ts";
import { matchArtistsDeterministic } from "../src/lib/discovery/match.ts";
import { manualToRaw } from "../src/lib/discovery/sources/manual.ts";

const artists = [
  { id: "a1", name: "When Chai Met Toast", normalizedName: "when chai met toast", aliases: ["wcmt", "when chai met toast"] },
  { id: "a2", name: "The Local Train", normalizedName: "the local train", aliases: ["tlt", "the local train"] },
  { id: "a3", name: "Anuv Jain", normalizedName: "anuv jain", aliases: ["anuv jain"] },
];
const raw = (over) => ({ artistNames: [], title: "", dateText: null, startsAt: null, datePrecision: "unknown", dateBucket: "unknown",
  venue: null, city: null, ticketUrl: null, sourceUrl: "https://x.com", sourceTitle: null, externalId: null,
  discoverySource: "other", excerpt: null, aiReported: false, officialApiRecord: false, ...over });

test("normalizes names and Indian city aliases", () => {
  assert.equal(normalizeName("  Anuv  Jáin! "), "anuv jain");
  assert.equal(normalizeCity("Bangalore"), "Bengaluru");
  assert.equal(normalizeCity("unknown"), null);
  assert.equal(normalizeCity("Bengaluru (Sulthanpet"), "Bengaluru");
  assert.equal(normalizeCity("Sulthanpet / Bengaluru, Karnataka, India"), "Bengaluru");
  assert.equal(normalizeCity("Udaipur"), "Udaipur");
});

test("dates: only what is stated is accepted", () => {
  assert.equal(parseDateField("2026-10-24").precision, "day");
  assert.equal(parseDateField("2026-12").precision, "month");
  assert.equal(parseDateField("15th November").precision, "unknown");
  assert.equal(parseDateField(null).startsAt, null);
});

test("venue spelling variants are not conflicts, different venues are", async () => {
  const { venuesDisagree } = await import("../src/lib/discovery/normalize.ts");
  assert.equal(venuesDisagree("EVP Film City", "EVP Convention Centre"), false);
  assert.equal(venuesDisagree("Le Méridien Kochi", "Le Meridien"), false);
  assert.equal(venuesDisagree("Zee Studios", "Phoenix Arena"), true);
  assert.equal(venuesDisagree(null, "Phoenix Arena"), false);
});

test("past events are detected", () => {
  assert.equal(isPast("2020-01-01T00:00:00Z", new Date()), true);
  assert.equal(isPast(null, new Date()), false);
});

test("exact and alias matching, multiple artists per event", () => {
  const m = matchArtistsDeterministic(raw({ artistNames: ["WCMT", "Anuv Jain"], title: "Night" }), artists);
  assert.deepEqual(m.map((x) => [x.artistId, x.method]).sort(), [["a1", "alias"], ["a3", "exact"]]);
});

test("short alias does not match free text in the title", () => {
  const m = matchArtistsDeterministic(raw({ artistNames: ["Someone Else"], title: "Atlas TLT cafe night" }), artists);
  assert.equal(m.length, 0);
});

test("unknown performer is not matched deterministically", () => {
  assert.equal(matchArtistsDeterministic(raw({ artistNames: ["Random Band"], title: "Random Band Live" }), artists).length, 0);
});

test("dedupe key is stable across spelling and city aliases", () => {
  assert.equal(dedupeKey("Anuv Jain", normalizeCity("Bangalore"), "2026-10-24"), dedupeKey("anuv  jain", "Bengaluru", "2026-10-24"));
});

test("manual submission: validates URL, never fabricates details", () => {
  assert.throws(() => manualToRaw({ url: "javascript:alert(1)", artist: "X" }));
  assert.throws(() => manualToRaw({ url: "https://in.bookmyshow.com/e/1", artist: " " }));
  const r = manualToRaw({ url: "https://in.bookmyshow.com/e/1", artist: "Anuv Jain" });
  assert.equal(r.startsAt, null);
  assert.equal(r.venue, null);
  assert.equal(r.datePrecision, "unknown");
  assert.equal(r.discoverySource, "manual_submission");
});
