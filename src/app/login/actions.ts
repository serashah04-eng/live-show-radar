"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { isTrialMode } from "@/lib/trial";
import { ensureTrialAccount, trialPassword } from "@/lib/trial-auth";

export interface AuthState {
  error?: string;
  message?: string;
}

const emailOk = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);

/**
 * TRIAL MODE sign-in: any email, any password. The password typed is ignored. Each email has a server-derived password
 * (see trial-auth.ts); we sign in with it using a normal password sign-in. The account is created on first use.
 * If anything fails, the real reason is written to the server log (never to the screen).
 */
async function trialLogin(rawEmail: string): Promise<AuthState> {
  const email = rawEmail.toLowerCase();
  const secret = process.env.SUPABASE_SECRET_KEY ?? "";
  const fail = (step: string, detail: string): AuthState => {
    console.error(`trial login failed at ${step}: ${detail}`.replace(/sb_secret_[A-Za-z0-9_-]+/g, "***"));
    return { error: "Could not sign you in right now. Please try again in a moment." };
  };
  if (!secret) return fail("config", "SUPABASE_SECRET_KEY is not set");

  const supabase = await createClient();
  const password = trialPassword(email, secret);
  let signedIn = !(await supabase.auth.signInWithPassword({ email, password })).error;
  let isNew = false;
  if (!signedIn) {
    const account = await ensureTrialAccount(createServiceClient(), email, secret);
    if ("error" in account) return fail("account", account.error);
    isNew = account.isNew;
    const retry = await supabase.auth.signInWithPassword({ email, password: account.password });
    if (retry.error) return fail("sign-in", retry.error.message);
    signedIn = true;
  }
  redirect(isNew ? "/start" : "/");
}

export async function signIn(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  if (!emailOk(email)) return { error: "Enter an email address (any email works in this trial)." };
  if (isTrialMode()) return trialLogin(email);
  if (!password) return { error: "Enter your password." };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    return {
      error: /confirm/i.test(error.message)
        ? "Please confirm your email first: open the link Supabase emailed you, then sign in."
        : "Email or password is incorrect.",
    };
  }
  redirect("/");
}

export async function signUp(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  if (!emailOk(email)) return { error: "Enter an email address (any email works in this trial)." };
  if (isTrialMode()) return trialLogin(email);
  if (password.length < 8) return { error: "Use a password with at least 8 characters." };

  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? (host?.startsWith("localhost") ? "http" : "https");
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { emailRedirectTo: `${proto}://${host}/auth/callback` },
  });
  if (error) return { error: error.message };
  if (data.session) redirect("/");
  return { message: "Account created. Check your email for a confirmation link, then sign in." };
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
