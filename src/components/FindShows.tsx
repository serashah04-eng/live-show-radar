"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { discoverForArtist } from "@/app/discover/actions";

export interface PendingArtist {
  id: string;
  name: string;
}

type Line = { name: string; text: string; ok: boolean };

const describe = (r: Awaited<ReturnType<typeof discoverForArtist>>): { text: string; ok: boolean } => {
  switch (r.status) {
    case "searched":
      return { ok: true, text: r.created > 0 ? `${r.created} new show${r.created === 1 ? "" : "s"} found` : r.found > 0 ? "no new shows (already known)" : "no upcoming India shows found" };
    case "skipped_recent":
      return { ok: true, text: "searched a few minutes ago" };
    case "no_sources":
      return { ok: false, text: "the search came back empty, try again in a bit" };
    default:
      return {
        ok: false,
        text: /429|RESOURCE_EXHAUSTED/i.test(r.error ?? "")
          ? "the Google Search quota for this API key is used up for now. Check the key's plan and billing in Google AI Studio, or try again later"
          : r.error ?? "search failed",
      };
  }
};

/**
 * Looks for shows by the artists you follow. One artist at a time (each search can take up to a couple of
 * minutes), with live progress. The feed refreshes when it finishes.
 */
export function FindShows({ pending, followedCount }: { pending: PendingArtist[]; followedCount: number }) {
  const router = useRouter();
  const [running, setRunning] = useState(false);
  const [current, setCurrent] = useState<string | null>(null);
  const [lines, setLines] = useState<Line[]>([]);
  const [done, setDone] = useState(false);
  const stop = useRef(false);

  const run = async () => {
    stop.current = false;
    setRunning(true);
    setDone(false);
    setLines([]);
    for (const a of pending) {
      if (stop.current) break;
      setCurrent(a.name);
      let res;
      try {
        res = await discoverForArtist(a.id);
      } catch {
        res = { artist: a.name, status: "failed" as const, found: 0, created: 0, error: "the request timed out" };
      }
      const d = describe(res);
      setLines((l) => [...l, { name: a.name, ...d }]);
    }
    setCurrent(null);
    setRunning(false);
    setDone(true);
    router.refresh();
  };

  if (followedCount === 0) return null;
  return (
    <section className="card" aria-label="Find shows">
      <div className="flex flex-wrap items-center gap-3">
        <div className="min-w-0 flex-1">
          <h2 className="text-xl">Find shows for my artists</h2>
          <p className="text-sm muted">
            {pending.length > 0
              ? `${pending.length} of the ${followedCount} artists you follow haven't been searched yet. Searches take up to a couple of minutes each.`
              : `All ${followedCount} artists you follow were searched recently. New shows are picked up automatically every 30 minutes.`}
          </p>
        </div>
        {pending.length > 0 && !running && (
          <button type="button" className="btn-primary arrow" onClick={run}>Find shows now</button>
        )}
        {running && (
          <button type="button" className="btn-ghost" onClick={() => (stop.current = true)}>Stop after this one</button>
        )}
      </div>
      <div aria-live="polite" className="mt-3 space-y-1 text-sm">
        {current && <p className="mono">Searching {current}…</p>}
        {lines.map((l, i) => (
          <p key={i} className={l.ok ? "" : "text-orange"}>
            <strong>{l.name}:</strong> {l.text}
          </p>
        ))}
        {done && lines.length > 0 && <p className="notice-ok mt-2">Done. Your feed has been refreshed.</p>}
      </div>
    </section>
  );
}
