import { ArtistAvatar } from "@/components/ArtistAvatar";
import { Suspense } from "react";
import { StatusBadge } from "@/components/StatusBadge";
import { requireAdmin } from "@/lib/auth";
import { eventDateParts, timeAgo } from "@/lib/format";
import { createServiceClient } from "@/lib/supabase/service";
import { ConfirmForm, EditForm, PhaseForm, StatusForm } from "./ReviewForms";

export default function ReviewPage() {
  return (
    <>
      <h1 className="text-4xl sm:text-5xl">Review queue</h1>
      <p className="mt-2 max-w-2xl muted">
        Owner only. Search results and AI answers never verify an event on their own: open the sources, read the page, then confirm with the text that proves it.
      </p>
      <Suspense fallback={<p className="mt-6 muted" role="status">Loading review queue…</p>}>
        <Queue />
      </Suspense>
    </>
  );
}

async function Queue() {
  await requireAdmin();
  const db = createServiceClient();
  const { data } = await db
    .from("events")
    .select(
      `id, title, starts_at, date_text, date_precision, venue, city, ticket_url, ticket_status, verification_status, corroborated, has_conflict, is_sample, last_checked_at, discovered_at,
       event_artists ( artists ( name ) ),
       event_sources ( source_url, source_title, discovery_source ),
       event_evidence ( kind, excerpt, evidence_url, checked_by, checked_at )`,
    )
    .in("verification_status", ["pending_verification", "verified"])
    .order("corroborated", { ascending: false })
    .order("discovered_at", { ascending: false });

  type Row = NonNullable<typeof data>[number];
  const rows = (data ?? []) as unknown as (Row & {
    event_artists: { artists: { name: string } | null }[];
    event_sources: { source_url: string; source_title: string | null; discovery_source: string }[];
    event_evidence: { kind: string; excerpt: string | null; evidence_url: string; checked_by: string | null }[];
  })[];
  const pending = rows.filter((r) => r.verification_status === "pending_verification");
  const verified = rows.filter((r) => r.verification_status === "verified");

  const Card = ({ r }: { r: (typeof rows)[number] }) => {
    const d = eventDateParts(r as never);
    const urls = r.event_sources.map((s) => s.source_url);
    const dateDefault = r.starts_at && (r.date_precision === "day" || r.date_precision === "exact") ? new Date(r.starts_at).toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" }) : "";
    return (
      <details className="card !p-0" open={r.corroborated && r.verification_status === "pending_verification" ? undefined : undefined}>
        <summary className="cursor-pointer list-none p-4">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge event={r as never} />
            <span className="text-xs muted">{r.event_sources.length} source(s) · discovered {timeAgo(r.discovered_at)}</span>
          </div>
          <h3 className="mt-2 flex items-center gap-3 text-xl"><ArtistAvatar name={(r.event_artists as unknown as { artists: { name: string } | null }[])[0]?.artists?.name ?? "?"} size={36} />{(r.event_artists as unknown as { artists: { name: string } | null }[]).map((a) => a.artists?.name).filter(Boolean).join(" + ")} · {r.city ?? "city?"}</h3>
          <p className="text-sm muted">{r.title} · {r.venue ?? "venue?"} · {d.full}</p>
        </summary>
        <div className="space-y-6 border-t border-line p-4">
          <section>
            <h4 className="label">Sources: open and read these first</h4>
            <ul className="space-y-1 text-sm">
              {r.event_sources.map((s) => (
                <li key={s.source_url}>
                  <a className="break-all text-cobalt-soft underline underline-offset-2" href={s.source_url} target="_blank" rel="noopener noreferrer">{s.source_title ?? s.source_url}</a>
                  <span className="muted"> · {s.discovery_source.replace("_", " ")}</span>
                </li>
              ))}
            </ul>
            {r.event_evidence.length > 0 && (
              <ul className="mt-2 space-y-1 text-xs muted">
                {r.event_evidence.map((e, i) => <li key={i}>{e.kind.replace("_", " ")}: {e.excerpt ?? "no excerpt"}</li>)}
              </ul>
            )}
          </section>
          {r.verification_status === "pending_verification" && (
            <section><h4 className="label">Confirm</h4><ConfirmForm eventId={r.id} sourceUrls={urls} /></section>
          )}
          {r.verification_status === "verified" && (
            <section><h4 className="label">Add a verified ticket phase / early-bird deadline</h4><PhaseForm eventId={r.id} sourceUrls={urls} /></section>
          )}
          <section>
            <h4 className="label">Correct details</h4>
            <EditForm eventId={r.id} d={{ title: r.title, date: dateDefault, venue: r.venue ?? "", city: r.city ?? "", ticketUrl: r.ticket_url ?? "", ticketStatus: r.ticket_status, hasConflict: r.has_conflict }} />
          </section>
          <section><h4 className="label">Reject / cancel / stale</h4><StatusForm eventId={r.id} /></section>
        </div>
      </details>
    );
  };

  return (
    <div className="mt-6 space-y-10">
      <section aria-labelledby="pq">
        <h2 id="pq" className="mb-3 text-2xl">Waiting for review ({pending.length})</h2>
        {pending.length === 0 ? <p className="card muted">Nothing waiting. New discoveries appear here.</p> : <div className="space-y-3">{pending.map((r) => <Card key={r.id} r={r} />)}</div>}
      </section>
      <section aria-labelledby="vq">
        <h2 id="vq" className="mb-3 text-2xl">Verified ({verified.length})</h2>
        {verified.length === 0 ? <p className="card muted">No verified events yet.</p> : <div className="space-y-3">{verified.map((r) => <Card key={r.id} r={r} />)}</div>}
      </section>
    </div>
  );
}
