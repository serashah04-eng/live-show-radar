"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export interface AuthState {
  error?: string;
  message?: string;
}

const emailOk = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);

export async function signIn(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  if (!emailOk(email)) return { error: "Enter a valid email address." };
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
  if (!emailOk(email)) return { error: "Enter a valid email address." };
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
