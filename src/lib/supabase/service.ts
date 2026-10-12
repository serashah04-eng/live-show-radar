import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/** Privileged client (bypasses RLS). Server-only; call only after authorising the caller. */
export function createServiceClient() {
  return createSupabaseClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SECRET_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
