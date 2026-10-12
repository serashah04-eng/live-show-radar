"use server";

import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { ensureTrialAccount, trialPassword } from "@/lib/trial-auth";

export interface SignInState {
  error?: string;
}

const emailOk = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);

/**
 * TEST sign-in (optional, never a gate): any email and any password. The password typed is ignored. Signing in lets the
 * same favourites follow an email across devices; whatever the visitor already saved as a guest is carried over.
 */
export async function testSignIn(_prev: SignInState, formData: FormData): Promise<SignInState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!emailOk(email)) return { error: "Enter an email address. Any email works in this test." };
  const secret = process.env.SUPABASE_SECRET_KEY ?? "";
  if (!secret) return { error: "Sign-in is not available right now." };

  const before = await getCurrentUser(); // the guest profile they have been using
  const supabase = await createClient();
  const password = trialPassword(email, secret);
  let result = await supabase.auth.signInWithPassword({ email, password });
  if (result.error) {
    const account = await ensureTrialAccount(createServiceClient(), email, secret);
    if ("error" in account) {
      console.error(`test sign-in failed at account: ${account.error}`);
      return { error: "Could not sign you in right now. Please try again in a moment." };
    }
    result = await supabase.auth.signInWithPassword({ email, password: account.password });
  }
  if (result.error || !result.data.user) {
    console.error(`test sign-in failed at sign-in: ${result.error?.message ?? "no user"}`);
    return { error: "Could not sign you in right now. Please try again in a moment." };
  }

  // carry the guest's favourites over to this email
  const to = result.data.user.id;
  if (before && before.id !== to) {
    const db = createServiceClient();
    const { data: follows } = await db.from("user_artist_follows").select("artist_id").eq("user_id", before.id);
    if (follows?.length) await db.from("user_artist_follows").upsert(follows.map((f) => ({ user_id: to, artist_id: f.artist_id })));
  }
  redirect("/");
}

export async function signOutTest() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/"); // the next request quietly starts a fresh guest profile
}
