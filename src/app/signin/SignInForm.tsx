"use client";

import { useActionState } from "react";
import { SubmitButton } from "@/components/SubmitButton";
import { testSignIn, type SignInState } from "./actions";

export function SignInForm() {
  const [state, action] = useActionState<SignInState, FormData>(testSignIn, {});
  return (
    <form action={action} className="card max-w-md space-y-3" aria-label="Test sign-in">
      <p className="notice">Test sign-in: any email and any password works. There is no password check, so don&apos;t use a real one.</p>
      <div>
        <label className="label" htmlFor="si-email">Email</label>
        <input id="si-email" name="email" type="email" required autoComplete="email" className="field" placeholder="you@example.com" />
      </div>
      <div>
        <label className="label" htmlFor="si-password">Password</label>
        <input id="si-password" name="password" type="password" autoComplete="off" className="field" placeholder="anything" />
      </div>
      <div aria-live="polite">{state.error && <p className="notice-err" role="alert">{state.error}</p>}</div>
      <SubmitButton pendingText="Signing in…">Sign in</SubmitButton>
    </form>
  );
}
