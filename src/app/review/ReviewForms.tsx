"use client";

import { useActionState } from "react";
import { SubmitButton } from "@/components/SubmitButton";
import { addTicketPhase, confirmEvent, editEvent, setEventStatus, type ReviewState } from "./actions";

function Result({ s }: { s: ReviewState }) {
  return (
    <div aria-live="polite">
      {s.error && <p className="notice-err" role="alert">{s.error}</p>}
      {s.ok && <p className="notice-ok">{s.ok}</p>}
    </div>
  );
}

export function ConfirmForm({ eventId, sourceUrls }: { eventId: string; sourceUrls: string[] }) {
  const [s, action] = useActionState<ReviewState, FormData>(confirmEvent, {});
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="eventId" value={eventId} />
      <p className="text-sm muted">Open a source, read it, then confirm only if the page itself states the artist, date and venue.</p>
      <div>
        <label className="label" htmlFor={`ev-${eventId}`}>Evidence page URL</label>
        <input id={`ev-${eventId}`} name="evidenceUrl" type="url" required list={`src-${eventId}`} className="field" />
        <datalist id={`src-${eventId}`}>{sourceUrls.map((u) => <option key={u} value={u} />)}</datalist>
      </div>
      <div>
        <label className="label" htmlFor={`ex-${eventId}`}>Text from the page that confirms it</label>
        <textarea id={`ex-${eventId}`} name="excerpt" required rows={2} className="field !py-2" />
      </div>
      <Result s={s} />
      <SubmitButton pendingText="Confirming…">Confirm as verified</SubmitButton>
    </form>
  );
}

export function StatusForm({ eventId }: { eventId: string }) {
  const [s, action] = useActionState<ReviewState, FormData>(setEventStatus, {});
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="eventId" value={eventId} />
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor={`st-${eventId}`}>Mark as</label>
          <select id={`st-${eventId}`} name="status" className="field" defaultValue="rejected">
            <option value="rejected">Rejected (wrong / not a real event)</option>
            <option value="cancelled">Cancelled</option>
            <option value="stale">Stale (outdated)</option>
            <option value="pending_verification">Back to unconfirmed</option>
          </select>
        </div>
        <div>
          <label className="label" htmlFor={`nt-${eventId}`}>Note (optional)</label>
          <input id={`nt-${eventId}`} name="note" className="field" />
        </div>
      </div>
      <Result s={s} />
      <SubmitButton className="btn-danger" pendingText="Saving…">Apply</SubmitButton>
    </form>
  );
}

export interface EditDefaults {
  title: string;
  date: string;
  venue: string;
  city: string;
  ticketUrl: string;
  ticketStatus: string;
  hasConflict: boolean;
}

export function EditForm({ eventId, d }: { eventId: string; d: EditDefaults }) {
  const [s, action] = useActionState<ReviewState, FormData>(editEvent, {});
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="eventId" value={eventId} />
      <div className="grid gap-3 sm:grid-cols-2">
        <div><label className="label" htmlFor={`t-${eventId}`}>Title</label><input id={`t-${eventId}`} name="title" defaultValue={d.title} className="field" /></div>
        <div><label className="label" htmlFor={`d-${eventId}`}>Date (YYYY-MM-DD or YYYY-MM)</label><input id={`d-${eventId}`} name="date" defaultValue={d.date} className="field" /></div>
        <div><label className="label" htmlFor={`v-${eventId}`}>Venue</label><input id={`v-${eventId}`} name="venue" defaultValue={d.venue} className="field" /></div>
        <div><label className="label" htmlFor={`c-${eventId}`}>City</label><input id={`c-${eventId}`} name="city" defaultValue={d.city} className="field" /></div>
        <div><label className="label" htmlFor={`u-${eventId}`}>Ticket URL</label><input id={`u-${eventId}`} name="ticketUrl" type="url" defaultValue={d.ticketUrl} className="field" /></div>
        <div>
          <label className="label" htmlFor={`ts-${eventId}`}>Ticket status</label>
          <select id={`ts-${eventId}`} name="ticketStatus" defaultValue={["tickets_available", "sold_out", "upcoming"].includes(d.ticketStatus) ? d.ticketStatus : "unknown"} className="field">
            <option value="unknown">Unknown</option>
            <option value="upcoming">Upcoming (tickets not yet on sale)</option>
            <option value="tickets_available">Tickets listed</option>
            <option value="sold_out">Sold out</option>
          </select>
        </div>
      </div>
      {d.hasConflict && (
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="clearConflict" className="size-5 accent-[#315cff]" /> I checked the sources and resolved the disagreement</label>
      )}
      <Result s={s} />
      <SubmitButton pendingText="Saving…" className="btn-ghost">Save corrections</SubmitButton>
    </form>
  );
}

export function PhaseForm({ eventId, sourceUrls }: { eventId: string; sourceUrls: string[] }) {
  const [s, action] = useActionState<ReviewState, FormData>(addTicketPhase, {});
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="eventId" value={eventId} />
      <p className="text-sm muted">Only add a phase or deadline that a page explicitly states. If there is no stated deadline, do not add an early-bird phase.</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor={`p-${eventId}`}>Phase</label>
          <select id={`p-${eventId}`} name="phase" className="field" defaultValue="early_bird">
            <option value="early_bird">Early bird</option>
            <option value="phase_1">Phase 1</option>
            <option value="phase_2">Phase 2</option>
            <option value="general">General</option>
            <option value="door">Door</option>
          </select>
        </div>
        <div><label className="label" htmlFor={`pr-${eventId}`}>Price (as stated)</label><input id={`pr-${eventId}`} name="price" className="field" /></div>
        <div><label className="label" htmlFor={`sa-${eventId}`}>Starts (IST)</label><input id={`sa-${eventId}`} name="startsAt" type="datetime-local" className="field" /></div>
        <div><label className="label" htmlFor={`ea-${eventId}`}>Ends (IST), as stated</label><input id={`ea-${eventId}`} name="endsAt" type="datetime-local" className="field" /></div>
      </div>
      <div>
        <label className="label" htmlFor={`pu-${eventId}`}>Evidence page URL</label>
        <input id={`pu-${eventId}`} name="evidenceUrl" type="url" required list={`psrc-${eventId}`} className="field" />
        <datalist id={`psrc-${eventId}`}>{sourceUrls.map((u) => <option key={u} value={u} />)}</datalist>
      </div>
      <div>
        <label className="label" htmlFor={`pe-${eventId}`}>Text from the page that states it</label>
        <textarea id={`pe-${eventId}`} name="excerpt" required rows={2} className="field !py-2" />
      </div>
      <Result s={s} />
      <SubmitButton pendingText="Saving…">Save verified phase</SubmitButton>
    </form>
  );
}
