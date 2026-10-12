"use server";

import { randomUUID } from "node:crypto";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { isTrialMode } from "@/lib/trial";

export interface AuthState {
  error?: string;
  message?: string;
}

const emailOk = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);

/**
 * TRIAL MODE sign-in: any email, any password. The account is created on first use and the password is never
 * checked: a one-time login token is issued for that email and exchanged for a normal session, so the rest of the
 * app (row-level security, per-user preferences) works exactly as it does for real accounts.
 */
async function trialLogin(rawEmail: string): Promise<AuthState> {
  const email = rawEmail.toLowerCase();
  const admin = createServiceClient();
  const created = await admin.auth.admin.createUser({ email, email_confirm: true, password: `${randomUUID()}${randomUUID()}` });
  const isNew = !created.error;
  if (created.error && !/already|registered|exists/i.test(created.error.message)) {
    return { error: "Could not sign you in right now. Please try again." };
  }
  const link = await admin.auth.admin.generateLink({ type: "magiclink", email });
  const tokenHash = link.data?.properties?.hashed_token;
  if (link.error || !tokenHash) return { error: "Could not sign you in right now. Please try again." };

  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({ type: "magiclink", token_hash: tokenHash });
  if (error) return { error: "Could not sign you in right now. Please try again." };
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
