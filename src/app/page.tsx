import Link from "next/link";
import { Suspense } from "react";
import { EventCard } from "@/components/EventCard";
import { FindShows } from "@/components/FindShows";
import { HeroNext } from "@/components/HeroNext";
import { Newsroom } from "@/components/Newsroom";
import { isAdminUser, requireUser } from "@/lib/auth";
import { loadFeedEvents, loadPendingSearches, loadPrefs } from "@/lib/data";
import { buildFeed, placeholderItem } from "@/lib/feed";
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
  const [events, { prefs, notif }] = await Promise.all([
    loadFeedEvents(sb),
    loadPrefs(sb, user.id),
  ]);
  const admin = await isAdminUser();
  // a channel counts as on when it can really deliver: your own setting, or the site-wide default sender
  const tgOn = Boolean((notif.telegram_enabled && notif.telegram_chat_id) || process.env.TELEGRAM_CHAT_ID);
  const mailOn = Boolean((notif.email_enabled && notif.email_address) || process.env.ALERT_TO_EMAIL);
  const pending = admin ? await loadPendingSearches(sb, prefs.followedArtistIds) : [];

  // newsroom: YOUR artists by default; every upcoming show only after "Show all" is pressed
  const upcoming = buildFeed(events, prefs, { scope: showAll ? "all" : "mine", sort: "date" }).filter((i) => !i.event.is_sample);
  // for you: your artists, your top city first
  const mine = buildFeed(events, prefs, { sort: "relevance" });
  const topCity = prefs.cities[0] ?? "Bengaluru";
  const earlyBird = mine.filter((i) => i.deadline !== null).sort((a, b) => (a.deadline as number) - (b.deadline as number));
  const ebReported = mine.filter((i) => i.deadline === null && (i.event.phases.some((p) => p.phase === "early_bird") || i.event.ticket_status === "early_bird_announced" || i.event.ticket_status === "early_bird_ending_soon"));
  // the hero: the next upcoming show among your favourites, else the next show anywhere
  const heroItem = mine.find((i) => !i.isPast) ?? upcoming[0] ?? null;
  const heroFav = Boolean(heroItem?.event.artists.some((a) => prefs.followedArtistIds.includes(a.id)));
  const history = buildFeed(events, prefs, { when: "past", sort: "relevance" });
  const allArtists = [...new Map(events.flatMap((e) => e.artists).map((a) => [a.id, a])).values()];
  const phCtx = { artists: allArtists, prefs, now: new Date() };


  return (
    <div className="space-y-12">
      <HeroNext item={heroItem} isFav={heroFav} />

      <p className="text-sm muted" role="status">
        Alerts: Telegram <strong className={tgOn ? "text-ok" : "text-orange"}>{tgOn ? "on" : "not set up"}</strong>
        {" · "}Email <strong className={mailOn ? "text-ok" : "text-orange"}>{mailOn ? "on" : "not set up"}</strong>
        {" · "}<Link href="/profile" className="underline underline-offset-2">Change</Link>
      </p>
      <Newsroom upcoming={upcoming} followedIds={prefs.followedArtistIds} showAll={showAll} />

      {admin ? (
        <FindShows pending={pending} followedCount={prefs.followedArtistIds.length} />
      ) : (
        prefs.followedArtistIds.length > 0 && <p className="text-sm muted" role="status">We are watching {prefs.followedArtistIds.length} artist{prefs.followedArtistIds.length === 1 ? "" : "s"} for new India shows around the clock. You get an alert the moment one is announced.</p>
      )}

      <section aria-labelledby="rec">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <h2 id="rec" className="text-3xl sm:text-4xl">For you · {topCity} first</h2>
          <span className="flex gap-4">
            <Link href="/favourites" className="mono underline underline-offset-2">Favourites</Link>
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

      <section aria-labelledby="eb">
        <h2 id="eb" className="mb-1 text-3xl sm:text-4xl"><span className="text-orange">Early-bird</span> tickets</h2>
        <p className="mb-4 text-sm muted">Early-bird windows close fast. A deadline is shown as confirmed only when a source states it; we alert you the moment one appears.</p>
        {earlyBird.length > 0 ? (
          <div className="space-y-3">{earlyBird.map((i) => <EventCard key={i.event.id} item={i} />)}</div>
        ) : ebReported.length > 0 ? (
          <div className="space-y-3">
            <p className="notice">Early bird has been mentioned for these shows, but no source gives a confirmed deadline yet. Check the source.</p>
            {ebReported.map((i) => <EventCard key={i.event.id} item={i} />)}
          </div>
        ) : (
          <p className="card muted">No early-bird sale announced for your artists yet. Nothing is hidden: when one is announced, it appears here and in your alerts.</p>
        )}
      </section>

      <section aria-labelledby="hist">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <h2 id="hist" className="text-3xl sm:text-4xl">Recent shows in India</h2>
          <Link href="/feed?when=past" className="mono underline underline-offset-2">All past shows</Link>
        </div>
        <div className="space-y-3">
          {(history.length ? history.slice(0, 3) : [placeholderItem({ when: "past" }, { ...phCtx, seed: "history" })]).map((i) => <EventCard key={i.event.id} item={i} />)}
        </div>
      </section>

    </div>
  );
}
