"use client";

import { useActionState } from "react";
import { SubmitButton } from "@/components/SubmitButton";
import { submitEvent, type SubmitState } from "./actions";

export function EventSubmitForm({ artists }: { artists: string[] }) {
  const [state, action] = useActionState<SubmitState, FormData>(submitEvent, {});
  return (
    <form action={action} className="card max-w-2xl space-y-4">
      <div>
        <label className="label" htmlFor="url">Public event page URL *</label>
        <input id="url" name="url" type="url" required placeholder="https://in.bookmyshow.com/…" className="field" />
        <p className="mt-1 text-xs muted">We store your link as evidence. We do not open or scrape the page.</p>
      </div>
      <div>
        <label className="label" htmlFor="artist">Artist *</label>
        <input id="artist" name="artist" list="artist-list" required className="field" />
        <datalist id="artist-list">{artists.map((a) => <option key={a} value={a} />)}</datalist>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="title">Event title</label>
          <input id="title" name="title" className="field" />
        </div>
        <div>
          <label className="label" htmlFor="date">Date (YYYY-MM-DD or YYYY-MM)</label>
          <input id="date" name="date" pattern="\d{4}-\d{2}(-\d{2})?" placeholder="2026-12-05" className="field" />
        </div>
        <div>
          <label className="label" htmlFor="venue">Venue</label>
          <input id="venue" name="venue" className="field" />
        </div>
        <div>
          <label className="label" htmlFor="city">City</label>
          <input id="city" name="city" className="field" />
        </div>
      </div>
      <div>
        <label className="label" htmlFor="note">Note (optional, e.g. what the page says)</label>
        <textarea id="note" name="note" rows={3} maxLength={500} className="field !py-2" />
      </div>
      <div aria-live="polite">{state.error && <p className="notice-err" role="alert">{state.error}</p>}</div>
      <SubmitButton pendingText="Submitting…">Submit for review</SubmitButton>
    </form>
  );
}
