import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ArtistAvatar } from "@/components/ArtistAvatar";
import { StatusBadge } from "@/components/StatusBadge";
import { BookButton } from "@/components/BookButton";
import { requireUser } from "@/lib/auth";
import { APP_NAME } from "@/lib/brand";
import { bookingLink, cleanVenue, locationLink } from "@/lib/feed";
import { sourceLinks } from "@/lib/links";
import { eventDateParts, formatDateTime, TICKET_STATUS_LABEL, timeAgo } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

export default function EventPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<p className="muted" role="status">Loading event…</p>}>
      <EventDetails params={params} />
    </Suspense>
  );
}

async function EventDetails({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  await requireUser();
  const sb = await createClient();
  const { data: e } = await sb
    .from("events")
    .select(
      `*, event_artists ( match_method, confidence, matched_text, artists ( name ) ),
       event_sources ( id, discovery_source, source_url, source_title, discovered_at, last_checked_at ),
       event_evidence ( id, kind, evidence_url, excerpt, checked_at, checked_by ),
       ticket_phases ( id, phase, starts_at, ends_at, price_text, verification_status, verified_at, event_evidence ( evidence_url, excerpt ) )`,
    )
    .eq("id", id)
    .maybeSingle();
  if (!e) notFound();

  const d = eventDateParts(e);
  const booking = bookingLink({
    ticket_url: e.ticket_url,
    sources: (e.event_sources as { source_url: string; source_title: string | null }[]).map((s) => ({ url: s.source_url, title: s.source_title })),
  });
  const where = locationLink(e);
  const srcs = sourceLinks((e.event_sources as { source_url: string; source_title: string | null }[]).map((x) => ({ url: x.source_url, title: x.source_title })));
  const article = srcs.find((x) => x.url !== booking?.url) ?? null;
  const firstArtist = (e.event_artists as { artists: { name: string } | null }[]).map((a) => a.artists?.name).find(Boolean) ?? e.title;
  const q = (t: string) => encodeURIComponent(t);
  const artists = (e.event_artists as { artists: { name: string } | null }[]).map((a) => a.artists?.name).filter(Boolean).join(" + ");
  const phases = e.ticket_phases as {
    id: string; phase: string; starts_at: string | null; ends_at: string | null; price_text: string | null;
    verification_status: string; verified_at: string | null; event_evidence: { evidence_url: string; excerpt: string | null } | null;
  }[];

  return (
    <article className="space-y-8">
      <div>
        <Link href="/feed" className="text-sm text-cobalt-soft underline underline-offset-2">← Back to feed</Link>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <StatusBadge event={e} />
          <span className="badge-pending">{TICKET_STATUS_LABEL[e.ticket_status] ?? e.ticket_status}</span>
        </div>
        <div className="mt-3 flex items-center gap-4"><ArtistAvatar name={firstArtist} size={88} /><h1 className="text-4xl sm:text-6xl">{artists || e.title}</h1></div>
        <p className="mt-2 text-lg">{e.title}</p>
      </div>

      {e.has_conflict && (
        <p className="notice-err" role="alert">
          Sources disagree about this event (for example the venue or date). Treat the details below as unconfirmed until it is reviewed.
        </p>
      )}
      {e.verification_status === "pending_verification" && (
        <p className="notice">
          {e.corroborated ? "Two or more independent websites report this event, but it has not been confirmed by an official source or the owner." : "Found by search and not yet confirmed. It may be wrong or out of date."}{" "}
          Open the source links and check before you decide anything.
        </p>
      )}

      <dl className="card grid gap-4 sm:grid-cols-2">
        {[
          ["Date", d.full],
          ["Venue", cleanVenue(e.venue) ?? "Not announced"],
          ["City", e.city ?? "Not stated"],
          ["First discovered", formatDateTime(e.discovered_at)],
          ["Last checked", e.last_checked_at ? `${timeAgo(e.last_checked_at)} (${formatDateTime(e.last_checked_at)})` : "Not yet"],
          ["Verified", e.verified_at ? formatDateTime(e.verified_at) : "Not verified"],
        ].map(([k, v]) => (
          <div key={k}>
            <dt className="label !mb-0">{k}</dt>
            <dd className="mt-1">{v}</dd>
          </div>
        ))}
        <div className="grid gap-3 sm:col-span-2 sm:grid-cols-3">
          <div className="rounded-xl border border-line p-3">
            <p className="label !mb-2">1 · Booking</p>
            <BookButton link={booking} large />
            <p className="mt-2 text-xs muted">{booking ? "A ticketing site. FrontRow does not sell tickets." : "No ticketing page has been found. We will alert you when one appears."}</p>
          </div>
          <div className="rounded-xl border border-line p-3">
            <p className="label !mb-2">2 · Location</p>
            {where ? <a href={where.url} target="_blank" rel="noopener noreferrer" className="btn-ghost min-h-12 px-6">Open in Maps</a> : <span className="badge-pending">Location not announced</span>}
            <p className="mt-2 text-xs muted">{where ? where.label : "Neither venue nor city is stated."}</p>
          </div>
          <div className="rounded-xl border border-line p-3">
            <p className="label !mb-2">3 · Where we found it</p>
            {article ? <a href={article.url} target="_blank" rel="noopener noreferrer" className="btn-ghost min-h-12 px-6">Read the article</a> : <span className="badge-pending">No article link</span>}
            <p className="mt-2 text-xs muted">{article ? `${article.host}: ${article.note}` : "Only a ticketing page is known."}</p>
          </div>
        </div>
      </dl>

      <section aria-labelledby="tp">
        <h2 id="tp" className="mb-3 text-2xl">Ticket phases</h2>
        {phases.length === 0 ? (
          <p className="card muted">No ticket phase or early-bird deadline has been confirmed. We never guess deadlines.</p>
        ) : (
          <ul className="space-y-3">
            {phases.map((p) => (
              <li key={p.id} className="card !p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <strong className="uppercase">{p.phase.replace("_", " ")}</strong>
                  <span className={p.verification_status === "verified" ? "badge-verified" : "badge-pending"}>{p.verification_status}</span>
                </div>
                <p className="mt-1 text-sm">
                  {p.starts_at && <>Opens {formatDateTime(p.starts_at)} · </>}
                  {p.ends_at ? <>Ends {formatDateTime(p.ends_at)}</> : "End time unknown"}
                  {p.price_text && <> · {p.price_text}</>}
                </p>
                {p.event_evidence && (
                  <p className="mt-1 text-xs muted">
                    Evidence:{" "}
                    <a className="text-cobalt-soft underline" href={p.event_evidence.evidence_url} target="_blank" rel="noopener noreferrer">{p.event_evidence.evidence_url}</a>
                    {p.event_evidence.excerpt && <> — “{p.event_evidence.excerpt}”</>}
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="src">
        <h2 id="src" className="mb-3 text-2xl">Sources and evidence</h2>
        <ul className="space-y-2">
          {(e.event_sources as { id: string; discovery_source: string; source_url: string; source_title: string | null; last_checked_at: string | null }[]).map((s) => (
            <li key={s.id} className="card !p-3 text-sm">
              <a className="break-all text-cobalt-soft underline underline-offset-2" href={s.source_url} target="_blank" rel="noopener noreferrer">{s.source_title ?? s.source_url}</a>
              <span className="ml-2 muted">via {s.discovery_source.replace("_", " ")} · checked {timeAgo(s.last_checked_at)}</span>
              {(() => { const c = sourceLinks([{ url: s.source_url, title: null }])[0]; return <span className={c.credibility === "credible" ? "badge-verified ml-2" : c.credibility === "lower" ? "badge-pending ml-2" : "badge-warn ml-2"} title={c.note}>{c.credibility === "credible" ? "Vetted source" : c.credibility === "lower" ? "Community listing" : "Unverified source"}</span>; })()}
            </li>
          ))}
        </ul>
        {(e.event_evidence as { id: string; kind: string; excerpt: string | null; checked_at: string; checked_by: string | null }[]).length > 0 && (
          <ul className="mt-4 space-y-2 text-sm">
            {(e.event_evidence as { id: string; kind: string; excerpt: string | null; checked_at: string; checked_by: string | null }[]).map((ev) => (
              <li key={ev.id} className="muted">
                {formatDateTime(ev.checked_at)} · {ev.kind.replace("_", " ")} · {ev.checked_by ? "reviewed by a person" : "automatic"}
                {ev.excerpt && <> — {ev.excerpt}</>}
              </li>
            ))}
          </ul>
        )}
      </section>
      <section aria-labelledby="nr">
        <h2 id="nr" className="mb-3 text-2xl">News and reviews</h2>
        <p className="mb-3 text-sm muted">These open a search for you. They are searches, not claims: FrontRow has not read the results.</p>
        <div className="flex flex-wrap gap-2">
          <a className="btn-ghost min-h-10 px-4" target="_blank" rel="noopener noreferrer" href={`https://news.google.com/search?q=${q(firstArtist + " India concert")}`}>Latest news</a>
          <a className="btn-ghost min-h-10 px-4" target="_blank" rel="noopener noreferrer" href={`https://www.google.com/search?q=${q(firstArtist + " live India concert review")}`}>Concert reviews</a>
          <a className="btn-ghost min-h-10 px-4" target="_blank" rel="noopener noreferrer" href={`https://www.youtube.com/results?search_query=${q(firstArtist + " live India")}`}>Watch on YouTube</a>
        </div>
      </section>
    </article>
  );
}
