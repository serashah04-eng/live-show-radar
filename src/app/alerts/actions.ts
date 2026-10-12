"use server";

import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

/** Remembers that this user has seen an early-bird pop-up, so it is never shown again for the same phase. */
export async function dismissAlert(phaseId: string) {
  if (!/^[0-9a-f-]{36}$/i.test(phaseId)) return;
  const user = await requireUser();
  const sb = await createClient(); // RLS: users can only write their own dismissals
  await sb.from("alert_dismissals").upsert({ user_id: user.id, phase_id: phaseId }, { onConflict: "user_id,phase_id", ignoreDuplicates: true });
}
