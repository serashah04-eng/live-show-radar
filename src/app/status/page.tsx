import { Suspense } from "react";
import { requireAdmin } from "@/lib/auth";
import { formatDateTime } from "@/lib/format";
import { createServiceClient } from "@/lib/supabase/service";
import { StatusActions } from "./StatusActions";

export default function StatusPage() {
  return (
    <>
      <h1 className="text-4xl sm:text-5xl">System status</h1>
      <Suspense fallback={<p className="mt-6 muted" role="status">Loading…</p>}>
        <Status />
      </Suspense>
    </>
  );
}

async function Status() {
  await requireAdmin();
  const db = createServiceClient();
  const count = async (q: PromiseLike<{ count: number | null }>) => (await q).count ?? 0;
  const [runs, failedNotifs, sent, dups, total, verified, corroborated, conflicts, logs] = await Promise.all([
    db.from("discovery_runs").select("*").order("started_at", { ascending: false }).limit(15),
    count(db.from("notification_log").select("*", { count: "exact", head: true }).eq("status", "failed")),
    count(db.from("notification_log").select("*", { count: "exact", head: true }).eq("status", "sent")),
    db.from("notification_log").select("duplicates_prevented").gt("duplicates_prevented", 0).then((r) =>
      (r.data ?? []).reduce((n, row) => n + (row.duplicates_prevented as number), 0),
    ),
    count(db.from("events").select("*", { count: "exact", head: true })),
    count(db.from("events").select("*", { count: "exact", head: true }).eq("verification_status", "verified")),
    count(db.from("events").select("*", { count: "exact", head: true }).eq("corroborated", true)),
    count(db.from("events").select("*", { count: "exact", head: true }).eq("has_conflict", true)),
    db.from("notification_log").select("*").eq("status", "failed").order("created_at", { ascending: false }).limit(10),
  ]);

  const stats: [string, number][] = [
    ["Events stored", total], ["Verified", verified], ["Reported by 2+ sites", corroborated], ["Source conflicts", conflicts],
    ["Alerts sent", sent], ["Alerts failed", failedNotifs], ["Duplicates prevented", dups],
  ];
  return (
    <div className="mt-6 space-y-8">
      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {stats.map(([k, v]) => (
          <div key={k} className="card !p-4"><dt className="text-xs uppercase tracking-wider muted">{k}</dt><dd className={`display mt-1 text-4xl ${k === "Alerts failed" && v > 0 ? "text-orange" : ""}`}>{v}</dd></div>
        ))}
      </dl>
      <StatusActions />
      <section>
        <h2 className="mb-3 text-2xl">Discovery runs</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <caption className="sr-only">Recent discovery runs</caption>
            <thead className="muted"><tr><th className="py-2 pr-4">Source</th><th className="pr-4">Started</th><th className="pr-4">Status</th><th className="pr-4">Found</th><th className="pr-4">New</th><th>Error</th></tr></thead>
            <tbody>
              {(runs.data ?? []).map((r) => (
                <tr key={r.id} className="border-t border-line">
                  <td className="py-2 pr-4">{r.source_name}</td><td className="pr-4">{formatDateTime(r.started_at)}</td>
                  <td className={`pr-4 ${r.status === "failed" ? "text-orange" : ""}`}>{r.status}</td><td className="pr-4">{r.events_found}</td><td className="pr-4">{r.events_new}</td>
                  <td className="text-xs text-orange">{r.error ?? ""}</td>
                </tr>
              ))}
              {(runs.data ?? []).length === 0 && <tr><td colSpan={6} className="py-3 muted">No runs recorded.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
      <section>
        <h2 className="mb-3 text-2xl">Failed notifications</h2>
        {(logs.data ?? []).length === 0 ? <p className="card muted">No failed deliveries.</p> : (
          <ul className="space-y-2 text-sm">
            {(logs.data ?? []).map((n) => <li key={n.id} className="card !p-3"><strong>{n.channel}</strong> · {n.notification_type} · attempt {n.attempt_count}/3 · {formatDateTime(n.created_at)}<br /><span className="text-orange">{n.error}</span></li>)}
          </ul>
        )}
      </section>
    </div>
  );
}
