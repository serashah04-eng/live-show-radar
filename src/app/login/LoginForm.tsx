"use client";

import { useActionState, useState } from "react";
import { SubmitButton } from "@/components/SubmitButton";
import { signIn, signUp, type AuthState } from "./actions";

export function LoginForm() {
  const [mode, setMode] = useState<"in" | "up">("in");
  const [state, action] = useActionState<AuthState, FormData>(mode === "in" ? signIn : signUp, {});

  return (
    <div className="card w-full max-w-md">
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
          <label className="label" htmlFor="email">Email</label>
          <input id="email" name="email" type="email" autoComplete="email" required className="field" />
        </div>
        <div>
          <label className="label" htmlFor="password">Password</label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete={mode === "in" ? "current-password" : "new-password"}
            minLength={mode === "up" ? 8 : undefined}
            required
            className="field"
          />
          {mode === "up" && <p className="mt-1 text-xs muted">At least 8 characters.</p>}
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
