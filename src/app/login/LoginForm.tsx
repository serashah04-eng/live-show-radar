"use client";

import { useActionState, useState } from "react";
import { SubmitButton } from "@/components/SubmitButton";
import { TRIAL_NOTICE } from "@/lib/trial";
import { signIn, signUp, type AuthState } from "./actions";

export function LoginForm({ trial }: { trial: boolean }) {
  const [mode, setMode] = useState<"in" | "up">(trial ? "up" : "in");
  const [state, action] = useActionState<AuthState, FormData>(mode === "in" ? signIn : signUp, {});

  return (
    <div className="card w-full max-w-md">
      {trial && (
        <div className="notice-err mb-5" role="note">
          <p className="badge-urgent mb-2">Trial build</p>
          <p className="font-semibold">Any email and any password works.</p>
          <p className="mt-1 text-xs">{TRIAL_NOTICE}</p>
        </div>
      )}
      <div role="tablist" aria-label="Sign in or create account" className="mb-5 flex gap-2">
        {(["in", "up"] as const).map((m) => (
          <button
            key={m}
            role="tab"
            type="button"
            aria-selected={mode === m}
            onClick={() => setMode(m)}
            className={mode === m ? "btn-primary flex-1" : "btn-ghost flex-1"}
          >
            {m === "in" ? "Sign in" : "Create account"}
          </button>
        ))}
      </div>
      <form action={action} className="space-y-4" key={mode}>
        <div>
          <label className="label" htmlFor="email">Email{trial ? " (any email)" : ""}</label>
          <input id="email" name="email" type="email" autoComplete="email" required className="field" placeholder={trial ? "anything@example.com" : undefined} />
        </div>
        <div>
          <label className="label" htmlFor="password">Password{trial ? " (any password, not checked)" : ""}</label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete={mode === "in" ? "current-password" : "new-password"}
            minLength={!trial && mode === "up" ? 8 : undefined}
            required={!trial}
            className="field"
            placeholder={trial ? "type anything, or leave empty" : undefined}
          />
          {!trial && mode === "up" && <p className="mt-1 text-xs muted">At least 8 characters.</p>}
          {trial && <p className="mt-1 text-xs muted">First time with an email? We create the account for you. Later, the same email returns to the same picks.</p>}
        </div>
        <div aria-live="polite">
          {state.error && <p className="notice-err" role="alert">{state.error}</p>}
          {state.message && <p className="notice-ok">{state.message}</p>}
        </div>
        <SubmitButton className="btn-primary w-full" pendingText={mode === "in" ? "Signing in…" : "Creating account…"}>
          {mode === "in" ? "Sign in" : "Create account"}
        </SubmitButton>
      </form>
    </div>
  );
}
