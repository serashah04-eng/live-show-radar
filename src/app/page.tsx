import Link from "next/link";
import { Suspense } from "react";
import { EventCard } from "@/components/EventCard";
import { FindShows } from "@/components/FindShows";
import { requireUser } from "@/lib/auth";
import { APP_NAME, APP_TAGLINE } from "@/lib/brand";
import { loadFeedEvents, loadPendingSearches, loadPrefs, loadRecentRuns } from "@/lib/data";
import { buildFeed } from "@/lib/feed";
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
  const earlyBird = feed.filter((i) => i.deadline !== null).sort((a, b) => (a.deadline as number) - (b.deadline as number));

  const latest = new Map<string, (typeof runs)[number]>();
  for (const r of runs) if (!latest.has(r.source_name)) latest.set(r.source_name, r);
  const lastSuccess = runs.find((r) => r.status === "success" || r.status === "partial");

  const ticker = followed.length ? followed.map((a) => a.name) : ["Pick your artists", `${topCity} first`, "Book before it sells out"];

  return (
    <div className="space-y-14">
      {/* 01 hero */}
      <section className="grid gap-px overflow-hidden rounded-2xl border border-line bg-line lg:grid-cols-[1.4fr_1fr]">
        <div className="mosaic bg-charcoal p-6 sm:p-10">
          <p className="section-no">01 · Your radar</p>
          <h1 className="wordmark mt-2 text-6xl sm:text-8xl">{APP_NAME}</h1>
          <p className="mt-3 max-w-xl text-xl font-bold">{APP_TAGLINE}</p>
          <p className="mt-1 max-w-xl text-sm muted">{topCity} first, all of India included. Alerts only say &ldquo;verified&rdquo; when there is evidence.</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/start" className="btn-primary arrow">{followed.length === 0 ? "Pick your scene" : "Change my picks"}</Link>
            <Link href="/feed" className="btn-ghost">Browse the feed</Link>
          </div>
        </div>
        <div className="bg-charcoal p-6 sm:p-8">
          <p className="mono">Following {followed.length}</p>
          {followed.length === 0 ? (
            <p className="mt-3 text-sm muted">Nobody yet. Tap <strong className="text-offwhite">Pick your scene</strong> and your radar fills with shows by the artists you choose.</p>
          ) : (
            <ul className="mt-3 grid grid-cols-5 gap-1.5 sm:grid-cols-6 lg:grid-cols-5" aria-label="Artists you follow">
              {followed.slice(0, 20).map((a) => {
                const [bg, fg] = tileColor(a.name);
                return (
                  <li key={a.id} title={a.name}>
                    <span className="mosaic-tile" style={{ background: bg, color: fg }}>{initials(a.name)}</span>
                  </li>
                );
              })}
              {followed.length > 20 && <li className="mosaic-tile bg-surface2 text-xs">+{followed.length - 20}</li>}
            </ul>
          )}
          <dl className="mt-5 grid grid-cols-2 gap-3">
            {[
              ["In your feed", feed.length],
              ["Verified", verified],
              ["Reported 2+ sites", reported],
              [`In ${topCity}`, inTopCity.length],
            ].map(([label, value]) => (
              <div key={label as string}>
                <dt className="mono">{label}</dt>
                <dd className="display text-4xl">{value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* marquee of the artists you picked */}
      <div className="marquee" aria-hidden="true">
        <div className="marquee-track">
          {[...ticker, ...ticker].map((n, i) => <span key={i} className="marquee-item">{n}</span>)}
        </div>
      </div>

      {/* find shows for newly picked artists */}
      <FindShows pending={pending} followedCount={followed.length} />

      {/* 02 recommendations: your #1 city first */}
      <section aria-labelledby="rec" className="reveal">
        <p className="section-no">02 · Recommended</p>
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <h2 id="rec" className="text-3xl sm:text-5xl">In {topCity} first</h2>
          <Link href="/settings" className="mono underline underline-offset-2">Change city priority</Link>
        </div>
        {feed.length === 0 ? (
          <div className="card">
            <p>Nothing matches your picks yet.</p>
            <p className="mt-1 text-sm muted">
              {followed.length === 0
                ? <>Tap <Link className="text-lime underline" href="/start">Pick your scene</Link> to choose artists, genres and cities.</>
                : <>Tap <strong>Find shows now</strong> above to search for shows by the {followed.length} artist{followed.length === 1 ? "" : "s"} you follow. We never fill the feed with made-up events.</>}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {inTopCity.length === 0 && <p className="card muted">No shows in {topCity} right now. Here is everything else that matches, nearest priority first.</p>}
            {[...inTopCity, ...elsewhere].slice(0, 6).map((i) => <EventCard key={i.event.id} item={i} />)}
            {feed.length > 6 && <Link href="/feed" className="btn-ghost arrow">See all {feed.length} shows</Link>}
          </div>
        )}
      </section>

      {/* 03 early bird */}
      <section aria-labelledby="eb" className="reveal">
        <p className="section-no">03 · Early-bird watch</p>
        <h2 id="eb" className="mb-4 text-3xl text-orange sm:text-5xl">Verified deadlines</h2>
        {earlyBird.length === 0 ? (
          <p className="card muted">
            No verified early-bird windows right now. Orange alerts only appear when a deadline is confirmed with evidence, so a quiet panel means
            nothing is confirmed, not that nothing exists. Check the feed for unconfirmed listings.
          </p>
        ) : (
          <div className="space-y-3">{earlyBird.map((i) => <EventCard key={i.event.id} item={i} />)}</div>
        )}
      </section>

      {/* 04 health */}
      <section aria-labelledby="health" className="reveal grid gap-4 md:grid-cols-2">
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
