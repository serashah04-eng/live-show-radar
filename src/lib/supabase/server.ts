import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { isLocalOwnerMode } from "@/lib/local-mode";
import { createServiceClient } from "./service";

/**
 * Supabase client acting as the signed-in user (Row Level Security applies).
 * In local owner mode (development only, never production) there is no session, so the
 * server uses the privileged client instead.
 */
export async function createClient() {
  if (isLocalOwnerMode()) return createServiceClient();
  const cookieStore = await cookies();
  return createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (list) => {
        try {
          for (const { name, value, options } of list) cookieStore.set(name, value, options);
        } catch {
          // Called from a Server Component: the proxy refreshes the session instead.
        }
      },
    },
  });
}
