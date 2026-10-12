// Behaviour tests for the personalization rules. Run: node --test scripts/feed.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import { buildFeed, emptyStateHints, bookingLink, buildFacets, eventType, placeholderItem, isPlaceholder } from "../src/lib/feed.ts";
import { registrableDomain, countIndependentDomains } from "../src/lib/discovery/corroboration-core.ts";

const NOW = new Date("2026-10-12T00:00:00Z");
const A = { id: "a1", name: "Anuv Jain", genreSlugs: ["indie-pop", "indie"] };
const B = { id: "a2", name: "The Local Train", genreSlugs: ["indie-rock", "rock"] };
const C = { id: "a3", name: "No Genre Artist", genreSlugs: [] };
const ev = (id, artist, city, date, over = {}) => ({
  id, title: `${artist.name} live`, starts_at: date ? `${date}T00:00:00Z` : null, date_text: null, date_precision: date ? "day" : "unknown",
  venue: null, city, ticket_url: null, ticket_status: "unknown", verification_status: "pending_verification", corroborated: false,
  has_conflict: false, is_sample: false, last_checked_at: null, discovered_at: "2026-10-01T00:00:00Z",
  artists: [artist], sources: [], phases: [], ...over,
});
const events = [
  ev("e1", A, "Bengaluru", "2026-11-01"),
  ev("e2", A, "Jaipur", "2026-10-24"),
  ev("e3", B, "Mumbai", "2026-12-05"),
  ev("e4", C, "Chennai", "2026-11-20"),
  ev("e5", A, "Delhi", "2020-01-01"), // past
];
const base = { allGenres: false, strictGenreMode: false, genreSlugs: [], cities: ["Bengaluru"], showOtherCities: true, followedArtistIds: [] };
const ids = (items) => items.map((i) => i.event.id);

test("changing genres changes results (OR logic)", () => {
  assert.deepEqual(ids(buildFeed(events, { ...base, genreSlugs: ["indie-pop"] }, {}, NOW)).sort(), ["e1", "e2"]);
  assert.deepEqual(ids(buildFeed(events, { ...base, genreSlugs: ["indie-pop", "rock"] }, {}, NOW)).sort(), ["e1", "e2", "e3"]);
});

test("All Genres shows everything upcoming", () => {
  assert.equal(buildFeed(events, { ...base, allGenres: true }, {}, NOW).length, 4);
});

test("following an artist surfaces their events even without genre metadata", () => {
  assert.deepEqual(ids(buildFeed(events, { ...base, followedArtistIds: ["a3"] }, {}, NOW)), ["e4"]);
});

test("unfollowing removes artist-based matches", () => {
  const followed = buildFeed(events, { ...base, followedArtistIds: ["a2"] }, {}, NOW);
  const unfollowed = buildFeed(events, { ...base, followedArtistIds: [] }, {}, NOW);
  assert.deepEqual(ids(followed), ["e3"]);
  assert.equal(unfollowed.length, 0);
});

test("strict genre mode hides followed artists without a matching genre", () => {
  const prefs = { ...base, strictGenreMode: true, genreSlugs: ["indie-pop"], followedArtistIds: ["a3"] };
  assert.deepEqual(ids(buildFeed(events, prefs, {}, NOW)).sort(), ["e1", "e2"]);
});

test("Bengaluru is prioritised but other cities are not hidden", () => {
  const items = buildFeed(events, { ...base, allGenres: true }, {}, NOW);
  assert.equal(items[0].event.city, "Bengaluru");
  assert.ok(ids(items).includes("e2") && ids(items).includes("e3"));
});

test("adding a city makes it a priority city; turning others off restricts the feed", () => {
  const prefs = { ...base, allGenres: true, cities: ["Bengaluru", "Mumbai"], showOtherCities: false };
  assert.deepEqual(ids(buildFeed(events, prefs, {}, NOW)).sort(), ["e1", "e3"]);
});

test("temporary filters narrow results and resetting them restores the saved-preference feed", () => {
  const prefs = { ...base, allGenres: true };
  const filtered = buildFeed(events, prefs, { city: "Jaipur" }, NOW);
  assert.deepEqual(ids(filtered), ["e2"]);
  assert.equal(buildFeed(events, prefs, {}, NOW).length, 4);
  assert.deepEqual(prefs, { ...base, allGenres: true }); // prefs object untouched
});

test("date filter excludes unknown dates and out-of-range events", () => {
  const prefs = { ...base, allGenres: true };
  assert.deepEqual(ids(buildFeed(events, prefs, { from: "2026-11-01", to: "2026-11-30" }, NOW)).sort(), ["e1", "e4"]);
});

test("status filter distinguishes verified, corroborated, pending", () => {
  const list = [
    ev("v", A, "Bengaluru", "2026-11-01", { verification_status: "verified" }),
    ev("c", A, "Bengaluru", "2026-11-02", { corroborated: true }),
    ev("p", A, "Bengaluru", "2026-11-03"),
  ];
  const prefs = { ...base, allGenres: true };
  assert.deepEqual(ids(buildFeed(list, prefs, { status: "verified" }, NOW)), ["v"]);
  assert.deepEqual(ids(buildFeed(list, prefs, { status: "corroborated" }, NOW)), ["c"]);
  assert.deepEqual(ids(buildFeed(list, prefs, { status: "pending" }, NOW)), ["p"]);
});

test("rejected, cancelled and stale events are hidden by default", () => {
  const list = [ev("x", A, "Bengaluru", "2026-11-01", { verification_status: "cancelled" }), ev("y", A, "Bengaluru", "2026-11-01", { verification_status: "rejected" })];
  assert.equal(buildFeed(list, { ...base, allGenres: true }, {}, NOW).length, 0);
});

test("sort by verified deadline puts soonest verified deadline first", () => {
  const mk = (id, end) => ev(id, A, "Bengaluru", "2026-12-01", { phases: end ? [{ phase: "early_bird", ends_at: end, verification_status: "verified" }] : [] });
  const items = buildFeed([mk("none", null), mk("late", "2026-11-20T00:00:00Z"), mk("soon", "2026-10-20T00:00:00Z")], { ...base, allGenres: true }, { sort: "deadline" }, NOW);
  assert.deepEqual(ids(items), ["soon", "late", "none"]);
});

test("unverified deadlines are ignored for deadline sorting", () => {
  const e = ev("u", A, "Bengaluru", "2026-12-01", { phases: [{ phase: "early_bird", ends_at: "2026-10-13T00:00:00Z", verification_status: "unverified" }] });
  const items = buildFeed([e, ev("w", A, "Bengaluru", "2026-11-01")], { ...base, allGenres: true }, { sort: "deadline" }, NOW);
  assert.deepEqual(ids(items), ["w", "u"]);
});

test("empty feed never fabricates events and offers broadening hints", () => {
  assert.equal(buildFeed([], { ...base, genreSlugs: ["jazz"] }, {}, NOW).length, 0);
  const hints = emptyStateHints({ ...base, strictGenreMode: true, showOtherCities: false }, { city: "Pune" });
  assert.ok(hints.length >= 4);
});

test("match reasons are transparent", () => {
  const [item] = buildFeed(events, { ...base, followedArtistIds: ["a1"], genreSlugs: ["indie-pop"] }, { city: "Bengaluru" }, NOW);
  assert.ok(item.reasons.includes("You follow Anuv Jain"));
  assert.ok(item.reasons.includes("Genre: indie-pop"));
  assert.ok(item.reasons.includes("Your top city: Bengaluru"));
});

test("corroboration needs independent domains", () => {
  assert.equal(registrableDomain("https://in.bookmyshow.com/events/x"), "bookmyshow.com");
  assert.equal(registrableDomain("https://www.district.in/y"), "district.in");
  assert.equal(registrableDomain("https://foo.example.co.in/y"), "example.co.in");
  assert.equal(countIndependentDomains(["https://in.bookmyshow.com/a", "https://www.bookmyshow.com/b"]), 1);
  assert.equal(countIndependentDomains(["https://in.bookmyshow.com/a", "https://livefiesta.com/b"]), 2);
});

// ---------- picks drive the feed, ordered city priority, discover scope, booking ----------
test("once you follow artists, All genres no longer floods the feed: it follows your picks", () => {
  const prefs = { ...base, allGenres: true, followedArtistIds: ["a2"] };
  assert.deepEqual(ids(buildFeed(events, prefs, {}, NOW)), ["e3"]); // only The Local Train's show
  assert.deepEqual(ids(buildFeed(events, { ...prefs, followedArtistIds: ["a1"] }, {}, NOW)).sort(), ["e1", "e2"]); // switching the pick changes the feed
});

test("a new user who follows nobody still sees everything under All genres", () => {
  assert.equal(buildFeed(events, { ...base, allGenres: true, followedArtistIds: [] }, {}, NOW).length, 4);
});

test("Discover mode adds shows by artists you do not follow, labelled as such", () => {
  const prefs = { ...base, allGenres: true, followedArtistIds: ["a2"] };
  const items = buildFeed(events, prefs, { scope: "all" }, NOW);
  assert.equal(items.length, 4);
  assert.ok(items.find((i) => i.event.id === "e1").reasons.includes("Discover: not one of your artists"));
  assert.ok(!items.find((i) => i.event.id === "e3").reasons.includes("Discover: not one of your artists"));
});

test("city priority is an ordered list: your #1 city comes first, then #2", () => {
  const prefs = { ...base, allGenres: true, cities: ["Mumbai", "Bengaluru"] };
  const items = buildFeed(events, prefs, {}, NOW);
  assert.deepEqual(items.slice(0, 2).map((i) => i.event.city), ["Mumbai", "Bengaluru"]);
  assert.equal(items[0].cityRank, 0);
  assert.ok(items[0].reasons.includes("Your top city: Mumbai"));
  assert.ok(items[1].reasons.includes("Your city #2: Bengaluru"));
  assert.equal(items[2].cityRank, 999); // other cities are still shown, just after
});

test("Bengaluru-first is the default order", () => {
  const items = buildFeed(events, { ...base, allGenres: true }, {}, NOW);
  assert.equal(items[0].event.city, "Bengaluru");
});

test("Book show link: stored ticket URL first, then ticketing sites, social posts last, never invented", () => {
  const src = (url) => ({ url, title: null });
  assert.deepEqual(bookingLink({ ticket_url: "https://tix.example.com/e1", sources: [] }), { url: "https://tix.example.com/e1", host: "tix.example.com", kind: "ticket" });
  const l = bookingLink({ ticket_url: null, sources: [src("https://www.instagram.com/reel/x"), src("https://blog.example.org/post"), src("https://in.bookmyshow.com/events/y")] });
  assert.equal(l.host, "in.bookmyshow.com");
  assert.equal(l.kind, "listing");
  assert.equal(bookingLink({ ticket_url: null, sources: [src("https://www.instagram.com/reel/x"), src("https://blog.example.org/post")] }).host, "blog.example.org");
  assert.equal(bookingLink({ ticket_url: null, sources: [] }), null);
});
test("default view is My artists once you follow anyone: genre-only matches are left out", () => {
  const prefs = { ...base, allGenres: false, genreSlugs: ["indie-pop"], followedArtistIds: ["a2"] }; // follows The Local Train, likes indie-pop
  assert.deepEqual(ids(buildFeed(events, prefs, {}, NOW)), ["e3"]); // Anuv Jain's indie-pop shows are NOT included
});

test("the + my genres view adds the genre matches back; Everything adds the rest", () => {
  const prefs = { ...base, allGenres: false, genreSlugs: ["indie-pop"], followedArtistIds: ["a2"] };
  assert.deepEqual(ids(buildFeed(events, prefs, { scope: "genres" }, NOW)).sort(), ["e1", "e2", "e3"]);
  assert.equal(buildFeed(events, prefs, { scope: "all" }, NOW).length, 4);
});

test("following nobody falls back to genres, so a brand-new user still sees something", () => {
  const prefs = { ...base, allGenres: false, genreSlugs: ["indie-pop"], followedArtistIds: [] };
  assert.deepEqual(ids(buildFeed(events, prefs, {}, NOW)).sort(), ["e1", "e2"]);
});

test("each pick changes the feed: follow one artist, then another", () => {
  const one = buildFeed(events, { ...base, allGenres: true, followedArtistIds: ["a1"] }, {}, NOW).map((i) => i.event.id).sort();
  const two = buildFeed(events, { ...base, allGenres: true, followedArtistIds: ["a1", "a3"] }, {}, NOW).map((i) => i.event.id).sort();
  assert.deepEqual(one, ["e1", "e2"]);
  assert.deepEqual(two, ["e1", "e2", "e4"]);
});
test("history view: only exact past shows, newest first, everything regardless of picks", () => {
  const list = [
    ev("up", A, "Mumbai", "2026-12-01"),
    ev("old1", B, "Delhi", "2026-03-10"),
    ev("old2", A, "Bengaluru", "2026-08-02"),
    ev("nodate", A, "Pune", null),
  ];
  const prefs = { ...base, allGenres: true, followedArtistIds: ["a1"] }; // follows only Anuv Jain
  const later = new Date("2026-10-12T00:00:00Z");
  assert.deepEqual(ids(buildFeed(list, prefs, { when: "past" }, later)), ["old2", "old1"]); // newest first, includes an artist you do not follow
  assert.ok(buildFeed(list, prefs, { when: "past" }, later).every((i) => i.isPast));
  assert.deepEqual(ids(buildFeed(list, prefs, {}, later)).sort(), ["nodate", "up"]); // default view hides history; an undated show is not history
});
// ---------- extra filters, facets and placeholders ----------
const withVenue = (id, artist, city, date, venue, title = "Show") => ev(id, artist, city, date, { venue, title });
const rich = [
  withVenue("r1", A, "Bengaluru", "2026-11-01", "Phoenix Arena", "Anuv Jain India Tour"),
  withVenue("r2", A, "Mumbai", "2026-11-20", "NSCI Dome", "Sunburn Festival Day 1"),
  withVenue("r3", B, "Mumbai", "2026-12-05", "Phoenix Arena", "Rooftop club night"),
];
const richPrefs = { ...base, allGenres: true, followedArtistIds: [] };

test("new filters: venue, month, type and text search narrow the feed", () => {
  assert.deepEqual(ids(buildFeed(rich, richPrefs, { venue: "phoenix arena" }, NOW)).sort(), ["r1", "r3"]);
  assert.deepEqual(ids(buildFeed(rich, richPrefs, { month: "2026-11" }, NOW)).sort(), ["r1", "r2"]);
  assert.deepEqual(ids(buildFeed(rich, richPrefs, { type: "Festival" }, NOW)), ["r2"]);
  assert.deepEqual(ids(buildFeed(rich, richPrefs, { q: "local train mumbai" }, NOW)), ["r3"]);
});

test("event type is read only from the title and venue", () => {
  assert.equal(eventType({ title: "Sunburn Festival Day 1", venue: null }), "Festival");
  assert.equal(eventType({ title: "Anuv Jain India Tour", venue: null }), "Tour date");
  assert.equal(eventType({ title: "Rooftop club night", venue: null }), "Club night");
  assert.equal(eventType({ title: "Anuv Jain live", venue: "Hall" }), "Concert");
});

test("every facet option has at least one real show (no empty filter choices)", () => {
  const view = buildFeed(rich, richPrefs, {}, NOW);
  const f = buildFacets(view);
  for (const group of Object.values(f)) for (const opt of group) assert.ok(opt.count >= 1);
  const check = (key, filterKey) => { for (const opt of f[key]) assert.ok(buildFeed(rich, richPrefs, { [filterKey]: opt.value }, NOW).length >= 1, `${key}:${opt.value}`); };
  check("venues", "venue"); check("months", "month"); check("types", "type"); check("cities", "city"); check("artists", "artistId");
  assert.equal(f.venues.find((v) => v.value === "Phoenix Arena").count, 2);
});

test("a filter combination with no real match gets a clearly labelled placeholder, never stored", () => {
  const none = buildFeed(rich, richPrefs, { venue: "NSCI Dome", month: "2026-12" }, NOW);
  assert.equal(none.length, 0);
  const ph = placeholderItem({ venue: "NSCI Dome", month: "2026-12" }, { artists: [A, B], prefs: richPrefs, now: NOW });
  assert.ok(isPlaceholder(ph.event));
  assert.match(ph.event.title, /^\[Placeholder\]/);
  assert.equal(ph.event.is_sample, true);
  assert.equal(ph.event.sources.length, 0); // no source means no booking link
  assert.equal(bookingLink(ph.event), null);
  assert.equal(ph.event.venue, "NSCI Dome");
  assert.ok(ph.event.starts_at.startsWith("2026-12"));
  assert.match(ph.reasons[0], /\[Placeholder\]/);
});