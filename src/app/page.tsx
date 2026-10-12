import Link from "next/link";
import { Suspense } from "react";
import { EventCard } from "@/components/EventCard";
import { FindShows } from "@/components/FindShows";
import { Newsroom } from "@/components/Newsroom";
import { isAdminUser, requireUser } from "@/lib/auth";
import { loadFeedEvents, loadPendingSearches, loadPrefs, loadRecentRuns } from "@/lib/data";
import { buildFeed, placeholderItem } from "@/lib/feed";
import { formatDateTime, timeAgo } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

// "Find shows" runs a search per artist from this page; allow it the hosting maximum.
export const maxDuration = 300;

export default function DashboardPage({ searchParams }: { searchParams: Promise<{ all?: string }> }) {
  return (
    <Suspense fallback={<p className="muted" role="status">Loading the newsroom…</p>}>
      <Dashboard searchParams={searchParams} />
    </Suspense>
  );
}

async function Dashboard({ searchParams }: { searchParams: Promise<{ all?: string }> }) {
  const showAll = (await searchParams).all === "1";
  const user = await requireUser();
  const sb = await createClient();
  const [events, { prefs, notif }, runs, failedAlerts] = await Promise.all([
    loadFeedEvents(sb),
    loadPrefs(sb, user.id),
    loadRecentRuns(sb, 12),
    sb.from("notification_log").select("*", { count: "exact", head: true }).eq("status", "failed"),
  ]);
  const admin = await isAdminUser();
  const pending = admin ? await loadPendingSearches(sb, prefs.followedArtistIds) : [];

  // newsroom: YOUR artists by default; every upcoming show only after "Show all" is pressed
  const upcoming = buildFeed(events, prefs, { scope: showAll ? "all" : "mine", sort: "date" }).filter((i) => !i.event.is_sample);
  // for you: your artists, your top city first
  const mine = buildFeed(events, prefs, { sort: "relevance" });
  const topCity = prefs.cities[0] ?? "Bengaluru";
  const earlyBird = mine.filter((i) => i.deadline !== null).sort((a, b) => (a.deadline as number) - (b.deadline as number));
  const history = buildFeed(events, prefs, { when: "past", sort: "relevance" });
  const allArtists = [...new Map(events.flatMap((e) => e.artists).map((a) => [a.id, a])).values()];
  const phCtx = { artists: allArtists, prefs, now: new Date() };

  const latest = new Map<string, (typeof runs)[number]>();
  for (const r of runs) if (!latest.has(r.source_name)) latest.set(r.source_name, r);
  const lastSuccess = runs.find((r) => r.status === "success" || r.status === "partial");

  return (
    <div className="space-y-12">
      <p className="text-sm muted" role="status">
        Alerts: Telegram <strong className={notif.telegram_enabled ? "text-lime" : "text-orange"}>{notif.telegram_enabled && notif.telegram_chat_id ? "on" : "not set up"}</strong>
        {" · "}Email <strong className={notif.email_enabled && notif.email_address ? "text-lime" : "text-orange"}>{notif.email_enabled && notif.email_address ? "on" : "not set up"}</strong>
        {" · "}<Link href="/settings" className="underline underline-offset-2">Change</Link>
      </p>
      <Newsroom upcoming={upcoming} followedIds={prefs.followedArtistIds} showAll={showAll} />

      {admin ? (
        <FindShows pending={pending} followedCount={prefs.followedArtistIds.length} />
      ) : (
        prefs.followedArtistIds.length > 0 && <p className="text-sm muted" role="status">We are watching ${prefs.followedArtistIds.length} artist${prefs.followedArtistIds.length === 1 ? "" : "s"} for new India shows around the clock. You get an alert the moment one is announced.</p>
      )}

      <section aria-labelledby="rec">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <h2 id="rec" className="text-3xl sm:text-4xl">For you · {topCity} first</h2>
          <span className="flex gap-4">
            <Link href="/artists" className="mono underline underline-offset-2">Change artists</Link>
            <Link href="/settings" className="mono underline underline-offset-2">Change cities</Link>
          </span>
        </div>
        {mine.length === 0 ? (
          <div className="space-y-3">
            <EventCard item={placeholderItem({}, { ...phCtx, seed: "recommended" })} />
            <p className="card muted">
              {prefs.followedArtistIds.length === 0
                ? <>You follow nobody yet. <Link className="text-lime underline" href="/start">Pick your artists</Link> and this list fills with their shows.</>
                : <>No shows found yet for the {prefs.followedArtistIds.length} artists you follow. Tap <strong>Find shows now</strong> above. The card above is a labelled placeholder, never a real show.</>}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {mine.slice(0, 5).map((i) => <EventCard key={i.event.id} item={i} />)}
            {mine.length > 5 && <Link href="/feed" className="btn-ghost arrow">See all {mine.length} shows for you</Link>}
          </div>
        )}
      </section>

      {earlyBird.length > 0 && (
        <section aria-labelledby="eb">
          <h2 id="eb" className="mb-4 text-3xl text-orange sm:text-4xl">Early-bird deadlines (verified)</h2>
          <div className="space-y-3">{earlyBird.map((i) => <EventCard key={i.event.id} item={i} />)}</div>
        </section>
      )}

      <section aria-labelledby="hist">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <h2 id="hist" className="text-3xl sm:text-4xl">Recent shows in India</h2>
          <Link href="/feed?when=past" className="mono underline underline-offset-2">All past shows</Link>
        </div>
        <div className="space-y-3">
          {(history.length ? history.slice(0, 3) : [placeholderItem({ when: "past" }, { ...phCtx, seed: "history" })]).map((i) => <EventCard key={i.event.id} item={i} />)}
        </div>
      </section>

      <details className="card">
        <summary className="cursor-pointer text-lg font-bold">Status: discovery and alerts</summary>
        <p className="mt-3 text-sm muted">
          Last successful discovery: <strong className="text-offwhite">{lastSuccess ? `${timeAgo(lastSuccess.finished_at ?? lastSuccess.started_at)} (${formatDateTime(lastSuccess.finished_at ?? lastSuccess.started_at)})` : "none yet"}</strong>
          {" · "}Failed alert deliveries: <strong className={(failedAlerts.count ?? 0) > 0 ? "text-orange" : "text-offwhite"}>{failedAlerts.count ?? 0}</strong>
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
      </details>
    </div>
  );
}
