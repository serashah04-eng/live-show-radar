import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { LOCAL_OWNER_ID, isLocalOwnerMode } from "@/lib/local-mode";
import { isTrialMode } from "@/lib/trial";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

export interface AppUser {
  id: string;
  email?: string;
}

let localOwnerReady = false;
async function ensureLocalOwner() {
  if (localOwnerReady) return;
  const db = createServiceClient();
  await db.from("profiles").upsert({ id: LOCAL_OWNER_ID, display_name: "Local owner", is_admin: true }, { onConflict: "id", ignoreDuplicates: true });
  await db.from("user_preferences").upsert({ user_id: LOCAL_OWNER_ID }, { onConflict: "user_id", ignoreDuplicates: true });
  await db.from("notification_preferences").upsert({ user_id: LOCAL_OWNER_ID }, { onConflict: "user_id", ignoreDuplicates: true });
  localOwnerReady = true;
}

/** Verified user for this request (asks Supabase Auth, not just the cookie). */
export const getCurrentUser = cache(async (): Promise<AppUser | null> => {
  if (isLocalOwnerMode()) {
    await ensureLocalOwner();
    return { id: LOCAL_OWNER_ID, email: "owner@local" };
  }
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  return data.user ? { id: data.user.id, email: data.user.email } : null;
});

export async function requireUser(): Promise<AppUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

const adminEmails = () =>
  (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);

export const isAdminUser = cache(async (): Promise<boolean> => {
  if (isLocalOwnerMode()) return true;
  // Trial build: anyone can sign in as any email, so an email can never grant admin rights.
  if (isTrialMode()) return false;
  const user = await getCurrentUser();
  if (!user) return false;
  if (user.email && adminEmails().includes(user.email.toLowerCase())) return true;
  const supabase = await createClient();
  const { data } = await supabase.from("profiles").select("is_admin").eq("id", user.id).maybeSingle();
  return Boolean(data?.is_admin);
});

export async function requireAdmin(): Promise<AppUser> {
  const user = await requireUser();
  if (!(await isAdminUser())) redirect("/");
  return user;
}
