"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { discoverForArtist } from "@/app/discover/actions";

export interface PendingArtist {
  id: string;
  name: string;
}

type Line = { name: string; text: string; ok: boolean; unavailable?: boolean };

/** What a person needs to know. Technical errors never reach the screen; "unavailable" means the search service could not be reached. */
const describe = (r: Awaited<ReturnType<typeof discoverForArtist>>): { text: string; ok: boolean; unavailable?: boolean } => {
  switch (r.status) {
    case "searched":
      return { ok: true, text: r.created > 0 ? `${r.created} new show${r.created === 1 ? "" : "s"} found` : r.found > 0 ? "nothing new, we already have their shows" : "no India shows announced yet. We keep watching and will alert you." };
    case "skipped_recent":
      return { ok: true, text: "checked a few minutes ago" };
    case "no_sources":
      return { ok: true, text: "no India shows announced yet. We keep watching and will alert you." };
    default:
      return { ok: false, unavailable: true, text: "could not be checked right now. We retry automatically." };
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
  const [unavailable, setUnavailable] = useState(false);
  const stop = useRef(false);

  const run = async () => {
    stop.current = false;
    setRunning(true);
    setDone(false);
    setUnavailable(false);
    setLines([]);
    let failedInARow = 0;
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
      failedInARow = d.unavailable ? failedInARow + 1 : 0;
      setLines((l) => [...l, { name: a.name, ...d }]);
      if (failedInARow >= 2) {
        setUnavailable(true); // the search service is down: stop instead of failing once per artist
        break;
      }
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
          <h2 className="text-xl">Find shows for favourites</h2>
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
        {unavailable && <p className="notice">Live search is unavailable right now. Your artists are safe and the site retries every 30 minutes by itself. You do not need to do anything.</p>}
        {lines.filter((l) => !unavailable || !l.unavailable).map((l, i) => (
          <p key={i} className={l.ok ? "" : "muted"}>
            <strong>{l.name}:</strong> {l.text}
          </p>
        ))}
        {done && !unavailable && lines.length > 0 && <p className="notice-ok mt-2">Done. Your feed has been refreshed.</p>}
      </div>
    </section>
  );
}
