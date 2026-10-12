"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { dismissAlert } from "@/app/alerts/actions";

export interface EarlyBirdItem {
  phaseId: string;
  eventId: string;
  artists: string;
  city: string | null;
  endsLabel: string;
  evidenceUrl: string;
  excerpt: string | null;
}

/** Prominent pop-up for newly verified early-bird phases. Each phase is shown once per user. */
export function EarlyBirdDialog({ items }: { items: EarlyBirdItem[] }) {
  const [queue, setQueue] = useState(items);
  const ref = useRef<HTMLDialogElement>(null);
  const current = queue[0];

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (current && !d.open) d.showModal();
    if (!current && d.open) d.close();
  }, [current]);

  if (!current) return null;
  const close = () => {
    void dismissAlert(current.phaseId);
    setQueue((q) => q.slice(1));
  };

  return (
    <dialog
      ref={ref}
      aria-labelledby="eb-title"
      onCancel={(e) => {
        e.preventDefault();
        close();
      }}
      className="m-auto w-[min(92vw,30rem)] rounded-2xl border-2 border-orange bg-surface p-6 text-offwhite backdrop:bg-black/70"
    >
      <p className="badge-urgent">Verified early bird{queue.length > 1 ? ` · ${queue.length} alerts` : ""}</p>
      <h2 id="eb-title" className="mt-3 text-3xl">{current.artists}</h2>
      <p className="mt-1 text-sm muted">{current.city ?? "City not stated"}</p>
      <p className="mt-4 text-lg">
        Early-bird window ends <strong className="text-orange">{current.endsLabel}</strong>
      </p>
      <p className="mt-3 text-sm muted">
        Confirmed from{" "}
        <a className="break-all text-cobalt-soft underline" href={current.evidenceUrl} target="_blank" rel="noopener noreferrer">
          this page
        </a>
        {current.excerpt && <>: “{current.excerpt.replace(/^\[Owner-reviewed\]\s*/, "")}”</>}
      </p>
      <div className="mt-6 flex flex-wrap gap-3">
        <Link href={`/events/${current.eventId}`} onClick={close} className="btn-primary">View event</Link>
        <button type="button" onClick={close} className="btn-ghost" autoFocus>Got it</button>
      </div>
      <p className="mt-4 text-xs muted">You decide whether to buy. This alert will not appear again.</p>
    </dialog>
  );
}
