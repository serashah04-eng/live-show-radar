"use client";

import { useActionState } from "react";
import { SubmitButton } from "@/components/SubmitButton";
import { runAlertsNow, sendTest, type StatusActionState } from "./actions";

function Output({ s }: { s: StatusActionState }) {
  return (
    <div aria-live="polite" className="mt-3">
      {s.error && <p className="notice-err" role="alert">{s.error}</p>}
      {s.lines && (
        <ul className="notice-ok space-y-1">
          {s.lines.map((l, i) => <li key={i}>{l}</li>)}
        </ul>
      )}
    </div>
  );
}

export function StatusActions() {
  const [t, testAction] = useActionState<StatusActionState>(sendTest, {});
  const [r, runAction] = useActionState<StatusActionState, FormData>(runAlertsNow, {});
  return (
    <section className="grid gap-4 md:grid-cols-2" aria-label="Alert controls">
      <div className="card">
        <h2 className="text-xl">Send a test alert</h2>
        <p className="mt-1 text-sm muted">Sends one message labelled TEST (no real concert) to the owner Telegram chat and email, so you can confirm delivery.</p>
        <form action={testAction} className="mt-3"><SubmitButton pendingText="Sending…">Send test to Telegram + email</SubmitButton></form>
        <Output s={t} />
      </div>
      <div className="card">
        <h2 className="text-xl">Run the alert cycle</h2>
        <p className="mt-1 text-sm muted">Preview shows what would be sent. Send now delivers real alerts for corroborated or verified events (each only once).</p>
        <form action={runAction} className="mt-3 flex flex-wrap gap-2">
          <button name="mode" value="preview" className="btn-ghost" type="submit">Preview</button>
          <SubmitButton pendingText="Sending…" className="btn-primary">Send now</SubmitButton>
        </form>
        <Output s={r} />
      </div>
    </section>
  );
}
