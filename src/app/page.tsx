import Link from "next/link";
import { Suspense } from "react";
import { EventCard } from "@/components/EventCard";
import { requireUser } from "@/lib/auth";
import { loadFeedEvents, loadPrefs, loadRecentRuns } from "@/lib/data";
import { buildFeed } from "@/lib/feed";
import { formatDateTime, timeAgo } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

export default function DashboardPage() {
  return (
    <Suspense fallback={<p className="muted" role="status">Loading your radar…</p>}>
      <Dashboard />
    </Suspense>
  );
}

async function Dashboard() {
  const user = await requireUser();
  const sb = await createClient();
  const [events, { prefs }, runs, failedAlerts] = await Promise.all([
    loadFeedEvents(sb),
    loadPrefs(sb, user.id),
    loadRecentRuns(sb, 12),
    sb.from("notification_log").select("*", { count: "exact", head: true }).eq("status", "failed"),
  ]);
  const feed = buildFeed(events, prefs, { sort: "relevance" });
  const verified = feed.filter((i) => i.event.verification_status === "verified").length;
  const reported = feed.filter((i) => i.event.verification_status === "pending_verification" && i.event.corroborated).length;
  const earlyBird = feed.filter((i) => i.deadline !== null).sort((a, b) => (a.deadline as number) - (b.deadline as number));

  // latest run per source
  const latest = new Map<string, (typeof runs)[number]>();
  for (const r of runs) if (!latest.has(r.source_name)) latest.set(r.source_name, r);
  const lastSuccess = runs.find((r) => r.status === "success" || r.status === "partial");

  return (
    <div className="space-y-10">
      <section>
        <h1 className="text-4xl sm:text-5xl">Your radar</h1>
        <p className="mt-2 max-w-2xl muted">
          Discovered concerts for the artists you follow, Bengaluru first, all of India included.
        </p>
        <dl className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            ["Artists followed", prefs.followedArtistIds.length],
            ["Concerts in your feed", feed.length],
            ["Verified", verified],
            ["Reported by 2+ sites", reported],
          ].map(([label, value]) => (
            <div key={label as string} className="card !p-4">
              <dt className="text-xs uppercase tracking-wider muted">{label}</dt>
              <dd className="display mt-1 text-4xl">{value}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section aria-labelledby="eb">
        <h2 id="eb" className="mb-3 text-2xl text-orange">Early-bird watch</h2>
        {earlyBird.length === 0 ? (
          <p className="card muted">
            No verified early-bird windows right now. Orange alerts only appear when a deadline is confirmed with evidence, so a quiet
            panel means nothing is confirmed, not that nothing exists. Check the feed for unconfirmed listings.
          </p>
        ) : (
          <div className="space-y-3">
            {earlyBird.map((i) => <EventCard key={i.event.id} item={i} />)}
          </div>
        )}
      </section>

      <section aria-labelledby="next">
        <div className="mb-3 flex items-end justify-between gap-4">
          <h2 id="next" className="text-2xl">Next up for you</h2>
          <Link href="/feed" className="text-sm text-cobalt-soft underline underline-offset-2">See the full feed</Link>
        </div>
        {feed.length === 0 ? (
          <div className="card">
            <p>Nothing matches your saved preferences yet.</p>
            <p className="mt-1 text-sm muted">
              Follow artists in <Link className="text-cobalt-soft underline" href="/artists">Artist Manager</Link> or broaden genres and cities in{" "}
              <Link className="text-cobalt-soft underline" href="/settings">Settings</Link>. We never fill the feed with made-up events.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {feed.slice(0, 5).map((i) => <EventCard key={i.event.id} item={i} />)}
          </div>
        )}
      </section>

      <section aria-labelledby="health" className="grid gap-4 md:grid-cols-2">
        <div className="card">
          <h2 id="health" className="mb-3 text-xl">Discovery status</h2>
          <p className="text-sm muted">
            Last successful discovery: <strong className="text-offwhite">{lastSuccess ? `${timeAgo(lastSuccess.finished_at ?? lastSuccess.started_at)} (${formatDateTime(lastSuccess.finished_at ?? lastSuccess.started_at)})` : "none yet"}</strong>
          </p>
          <ul className="mt-3 space-y-2 text-sm">
            {[...latest.values()].map((r) => (
              <li key={r.id} className="flex flex-wrap items-center justify-between gap-2">
                <span>{r.source_name}</span>
                <span className={r.status === "failed" ? "badge-warn" : "badge-verified"}>
                  {r.status}: found {r.events_found}, new {r.events_new}
                </span>
                {r.error && <span className="w-full text-xs text-orange">{r.error}</span>}
              </li>
            ))}
            {latest.size === 0 && <li className="muted">No discovery runs recorded yet.</li>}
          </ul>
        </div>
        <div className="card">
          <h2 className="mb-3 text-xl">Alerts</h2>
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
