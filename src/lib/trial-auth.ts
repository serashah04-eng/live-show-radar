import { createHmac } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Trial sign-in helper. In the trial build ANY email and ANY password is accepted: the password the visitor types is
 * ignored, and the account instead gets a server-derived password (an HMAC of the email with a server-only secret) that
 * nobody ever sees. The app then signs in with that derived password using a normal Supabase password sign-in, so
 * sessions, cookies and row-level security work exactly as for real accounts.
 */
export const trialPassword = (email: string, secret: string) =>
  createHmac("sha256", secret).update(`frontrow-trial:${email.trim().toLowerCase()}`).digest("hex");

export type TrialAccount = { password: string; isNew: boolean } | { error: string };

/** Creates the account on first use, or repairs an existing account's password so the derived one works. */
export async function ensureTrialAccount(admin: SupabaseClient, email: string, secret: string): Promise<TrialAccount> {
  const password = trialPassword(email, secret);
  const created = await admin.auth.admin.createUser({ email, email_confirm: true, password });
  if (!created.error) return { password, isNew: true };
  if (!/already|registered|exists/i.test(created.error.message)) return { error: `create user: ${created.error.message}` };

  for (let page = 1; page <= 50; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) return { error: `list users: ${error.message}` };
    const user = data.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
    if (user) {
      const updated = await admin.auth.admin.updateUserById(user.id, { password, email_confirm: true });
      return updated.error ? { error: `update user: ${updated.error.message}` } : { password, isNew: false };
    }
    if (data.users.length < 200) break;
  }
  return { error: "account not found after create conflict" };
}
