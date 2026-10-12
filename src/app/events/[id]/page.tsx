import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { StatusBadge } from "@/components/StatusBadge";
import { requireUser } from "@/lib/auth";
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
        <h1 className="mt-3 text-4xl sm:text-6xl">{artists || e.title}</h1>
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
          ["Venue", e.venue ?? "Not stated"],
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
        {e.ticket_url && (
          <div className="sm:col-span-2">
            <a className="btn-primary" href={e.ticket_url} target="_blank" rel="noopener noreferrer">Open ticket page</a>
            <p className="mt-1 text-xs muted">Opens the seller&apos;s site. You decide whether to buy.</p>
          </div>
        )}
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
    </article>
  );
}
