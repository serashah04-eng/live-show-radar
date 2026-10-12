import Link from "next/link";
import { Suspense } from "react";
import { EventCard } from "@/components/EventCard";
import { FindShows } from "@/components/FindShows";
import { PhotoTile } from "@/components/PhotoTile";
import { requireUser } from "@/lib/auth";
import { APP_NAME, APP_TAGLINE } from "@/lib/brand";
import { loadFeedEvents, loadPendingSearches, loadPrefs, loadRecentRuns } from "@/lib/data";
import { buildFeed, placeholderItem } from "@/lib/feed";
import { formatDateTime, timeAgo } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

// "Find shows" runs a search per artist from this page; allow it the hosting maximum.
export const maxDuration = 300;

export default function DashboardPage() {
  return (
    <Suspense fallback={<p className="muted" role="status">Loading your radar…</p>}>
      <Dashboard />
    </Suspense>
  );
}

const TILE_COLORS = [["#315cff", "#fff"], ["#ff7a30", "#0c0e13"], ["#c4d600", "#0c0e13"], ["#2a3041", "#f4f5f7"]];
const tileColor = (name: string) => {
  let h = 0;
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return TILE_COLORS[h % TILE_COLORS.length];
};
const initials = (name: string) => name.replace(/[^A-Za-z0-9 ]/g, "").split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase() || "?";

async function Dashboard() {
  const user = await requireUser();
  const sb = await createClient();
  const [events, { prefs }, runs, failedAlerts] = await Promise.all([
    loadFeedEvents(sb),
    loadPrefs(sb, user.id),
    loadRecentRuns(sb, 12),
    sb.from("notification_log").select("*", { count: "exact", head: true }).eq("status", "failed"),
  ]);
  const [pending, { data: followedRows }] = await Promise.all([
    loadPendingSearches(sb, prefs.followedArtistIds),
    prefs.followedArtistIds.length ? sb.from("artists").select("id, name").in("id", prefs.followedArtistIds).order("name") : Promise.resolve({ data: [] as { id: string; name: string }[] }),
  ]);
  const followed = followedRows ?? [];

  const feed = buildFeed(events, prefs, { sort: "relevance" });
  const topCity = prefs.cities[0] ?? "Bengaluru";
  const inTopCity = feed.filter((i) => i.cityRank === 0);
  const elsewhere = feed.filter((i) => i.cityRank !== 0);
  const verified = feed.filter((i) => i.event.verification_status === "verified").length;
  const reported = feed.filter((i) => i.event.verification_status === "pending_verification" && i.event.corroborated).length;
  const allArtists = [...new Map(events.flatMap((e) => e.artists).map((a) => [a.id, a])).values()];
  const phCtx = { artists: allArtists, prefs, now: new Date() };
  const history = buildFeed(events, prefs, { when: "past", sort: "relevance" });
  const earlyBird = feed.filter((i) => i.deadline !== null).sort((a, b) => (a.deadline as number) - (b.deadline as number));

  const latest = new Map<string, (typeof runs)[number]>();
  for (const r of runs) if (!latest.has(r.source_name)) latest.set(r.source_name, r);
  const lastSuccess = runs.find((r) => r.status === "success" || r.status === "partial");

  const ticker = followed.length ? followed.map((a) => a.name) : ["Pick your artists", `${topCity} first`, "Book before it sells out"];

  return (
    <div className="space-y-14">
      {/* 01 hero: photo tiles with hairline gutters */}
      <section data-gsap="mosaic" className="grid gap-px overflow-hidden rounded-2xl border border-line bg-line lg:grid-cols-[1.7fr_1fr]">
        <PhotoTile photo="stage" priority className="min-h-[26rem] p-6 sm:p-10">
          <p className="section-no !text-white/70">01 · Your radar</p>
          <h1 className="wordmark mt-3 text-6xl sm:text-9xl">{APP_NAME}</h1>
          <p className="mt-3 max-w-xl text-xl font-bold text-white">{APP_TAGLINE}</p>
          <p className="mt-1 max-w-xl text-sm text-white/75">{topCity} first, all of India included. Alerts only say &ldquo;verified&rdquo; when there is evidence.</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/start" className="btn-primary arrow">{followed.length === 0 ? "Pick your scene" : "Change my picks"}</Link>
            <Link href="/feed" className="btn-ghost !bg-black/30">Browse the feed</Link>
          </div>
        </PhotoTile>
        <div className="grid gap-px bg-line">
          <PhotoTile photo="crowd" className="min-h-48 p-5">
            <p className="mono !text-white/70">Following {followed.length}</p>
            {followed.length === 0 ? (
              <p className="mt-2 text-sm text-white/80">Tap <strong>Pick your scene</strong> and this fills with the artists you choose.</p>
            ) : (
              <ul className="mt-2 grid grid-cols-6 gap-1" aria-label="Artists you follow">
                {followed.slice(0, 12).map((a) => {
                  const [bg, fg] = tileColor(a.name);
                  return <li key={a.id} title={a.name}><span className="mosaic-tile" style={{ background: bg, color: fg }}>{initials(a.name)}</span></li>;
                })}
                {followed.length > 12 && <li className="mosaic-tile bg-black/50 text-xs text-white">+{followed.length - 12}</li>}
              </ul>
            )}
          </PhotoTile>
          <PhotoTile photo="lights" className="min-h-48 p-5">
            <dl className="grid grid-cols-2 gap-3">
              {[["In your feed", feed.length], ["Verified", verified], ["Reported 2+ sites", reported], [`In ${topCity}`, inTopCity.length]].map(([label, value]) => (
                <div key={label as string}>
                  <dt className="mono !text-white/70">{label}</dt>
                  <dd className="display text-4xl text-white">{value}</dd>
                </div>
              ))}
            </dl>
          </PhotoTile>
        </div>
      </section>
      {/* marquee of the artists you picked */}
      <div className="marquee" data-gsap="marquee" aria-hidden="true">
        <div className="marquee-track">
          {[...ticker, ...ticker].map((n, i) => <span key={i} className="marquee-item">{n}</span>)}
        </div>
      </div>

      {/* find shows for newly picked artists */}
      <FindShows pending={pending} followedCount={followed.length} />

      {/* 02 recommendations: your #1 city first */}
      <section aria-labelledby="rec" data-gsap="rise">
        <p className="section-no">02 · Recommended</p>
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <h2 id="rec" className="text-3xl sm:text-5xl">In {topCity} first</h2>
          <Link href="/settings" className="mono underline underline-offset-2">Change city priority</Link>
        </div>
        {feed.length === 0 ? (
          <div className="space-y-3">
          <EventCard item={placeholderItem({}, { ...phCtx, seed: "recommended" })} />
          <div className="card">
            <p>Nothing real matches your picks yet.</p>
            <p className="mt-1 text-sm muted">
              {followed.length === 0
                ? <>Tap <Link className="text-lime underline" href="/start">Pick your scene</Link> to choose artists, genres and cities.</>
                : <>Tap <strong>Find shows now</strong> above to search for shows by the {followed.length} artist{followed.length === 1 ? "" : "s"} you follow. The card above is a labelled placeholder, never a real show.</>}
            </p>
          </div>
          </div>
        ) : (
          <div className="space-y-3">
            {inTopCity.length === 0 && <p className="card muted">No shows in {topCity} right now. Here is everything else that matches, nearest priority first.</p>}
            {[...inTopCity, ...elsewhere].slice(0, 6).map((i) => <EventCard key={i.event.id} item={i} />)}
            {feed.length > 6 && <Link href="/feed" className="btn-ghost arrow">See all {feed.length} shows</Link>}
          </div>
        )}
      </section>

      {/* history: shows that already happened */}
      <section aria-labelledby="hist" data-gsap="rise">
        <p className="section-no">History</p>
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <h2 id="hist" className="text-3xl sm:text-5xl">Recent shows in India</h2>
          <Link href="/feed?when=past" className="mono underline underline-offset-2">All past shows</Link>
        </div>
        <div className="space-y-3">
          {(history.length ? history.slice(0, 6) : [placeholderItem({ when: "past" }, { ...phCtx, seed: "history" })]).map((i) => <EventCard key={i.event.id} item={i} />)}
        </div>
      </section>

      {/* 03 early bird */}
      <section aria-labelledby="eb" data-gsap="rise">
        <p className="section-no">03 · Early-bird watch</p>
        <h2 id="eb" className="mb-4 text-3xl text-orange sm:text-5xl">Verified deadlines</h2>
        {earlyBird.length === 0 ? (
          <div className="space-y-3">
            <p className="card muted">
              No verified early-bird windows right now. Orange alerts only appear when a deadline is confirmed with evidence, so a quiet panel means
              nothing is confirmed, not that nothing exists. Here is what one will look like:
            </p>
            <EventCard item={{ ...placeholderItem({}, { ...phCtx, seed: "early-bird" }), reasons: ["[Placeholder] Example of a verified early-bird card. Real ones appear only with a confirmed deadline and evidence."] }} />
          </div>
        ) : (
          <div className="space-y-3">{earlyBird.map((i) => <EventCard key={i.event.id} item={i} />)}</div>
        )}
      </section>

      {/* statement: words light up as you scroll */}
      <section aria-label="What FrontRow does">
        <p className="section-no mb-4">Why FrontRow</p>
        <p className="statement max-w-5xl" data-gsap="words">
          {"Be first to every show in India. Pick your artists, and we search, cross-check and alert you before the early-bird window closes."
            .split(" ")
            .map((w, i) => <span key={i} className="w">{w} </span>)}
        </p>
      </section>

      {/* numbered how-it-works rows */}
      <section aria-labelledby="how">
        <p className="section-no">How it works</p>
        <h2 id="how" className="mb-4 text-3xl sm:text-5xl">Five steps</h2>
        <div data-gsap="stagger">
          {[
            ["01", "Pick", "Tap your artists, genres and cities", "/start"],
            ["02", "Discover", "We search for their shows across India", "/feed"],
            ["03", "Cross-check", "Two independent sites make it “reported”", "/feed"],
            ["04", "Verify", "Evidence makes it “verified”", "/feed"],
            ["05", "Book", "Open the booking page and decide", "/feed"],
          ].map(([n, t, d, href]) => (
            <Link key={n} href={href} className="num-row">
              <span className="mono">{n}</span>
              <span><span className="t block">{t}</span><span className="mt-1 block text-sm muted">{d}</span></span>
              <span className="text-2xl" aria-hidden="true">{"↗"}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* featured artists list + photo band */}
      <section aria-labelledby="feat" className="grid gap-px overflow-hidden rounded-2xl border border-line bg-line lg:grid-cols-2">
        <div className="bg-charcoal p-6 sm:p-8">
          <p className="section-no">Featured</p>
          <h2 id="feat" className="mb-4 text-3xl sm:text-4xl">Your artists</h2>
          {followed.length === 0 ? (
            <p className="text-sm muted">Nobody yet. <Link href="/start" className="text-lime underline">Pick your scene</Link>.</p>
          ) : (
            <ul data-gsap="stagger">
              {followed.slice(0, 8).map((a) => (
                <li key={a.id} className="num-row !grid-cols-[1fr_auto] !py-3">
                  <Link href={`/feed`} className="t !text-2xl sm:!text-3xl">{a.name}</Link>
                  <span className="mono">Follow</span>
                </li>
              ))}
            </ul>
          )}
          <Link href="/artists" className="btn-ghost arrow mt-5">See all artists</Link>
        </div>
        <PhotoTile photo="band" className="min-h-72" />
      </section>
      {/* 04 health */}
      <section aria-labelledby="health" data-gsap="rise" className="grid gap-4 md:grid-cols-2">
        <div className="card">
          <p className="section-no">04 · Status</p>
          <h2 id="health" className="mb-3 mt-1 text-xl">Discovery</h2>
          <p className="text-sm muted">
            Last successful discovery: <strong className="text-offwhite">{lastSuccess ? `${timeAgo(lastSuccess.finished_at ?? lastSuccess.started_at)} (${formatDateTime(lastSuccess.finished_at ?? lastSuccess.started_at)})` : "none yet"}</strong>
          </p>
          <ul className="mt-3 space-y-2 text-sm">
            {[...latest.values()].map((r) => (
              <li key={r.id} className="flex flex-wrap items-center justify-between gap-2">
                <span>{r.source_name}</span>
                <span className={r.status === "failed" ? "badge-warn" : "badge-verified"}>{r.status}: found {r.events_found}, new {r.events_new}</span>
                {r.error && <span className="w-full text-xs text-orange">{r.error}</span>}
              </li>
            ))}
            {latest.size === 0 && <li className="muted">No discovery runs recorded yet.</li>}
          </ul>
        </div>
        <div className="card">
          <h2 className="mb-3 mt-1 text-xl">Alerts</h2>
          <p className="text-sm muted">
            Failed notification deliveries: <strong className={(failedAlerts.count ?? 0) > 0 ? "text-orange" : "text-offwhite"}>{failedAlerts.count ?? 0}</strong>
          </p>
          <p className="mt-2 text-xs muted">
            Telegram and email alerts send only for corroborated or verified events, labelled as such. Urgent early-bird alerts need a verified deadline with evidence.
          </p>
        </div>
      </section>
    </div>
  );
}
