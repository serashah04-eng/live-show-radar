import { Suspense } from "react";
import { requireUser } from "@/lib/auth";
import { loadPrefs } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";
import { ProfileForm } from "./ProfileForm";

export default function ProfilePage() {
  return (
    <>
      <h1>Your profile</h1>
      <p className="mt-1 max-w-xl text-sm muted">Tell us how to reach you. Alerts and pop-ups use these details; nothing here is shown to anyone else.</p>
      <Suspense fallback={<p className="mt-4 muted" role="status">Loading your profile…</p>}>
        <Profile />
      </Suspense>
    </>
  );
}

async function Profile() {
  const user = await requireUser();
  const sb = await createClient();
  const [{ notif }, { data: auth }] = await Promise.all([loadPrefs(sb, user.id), sb.auth.getUser()]);
  const meta = (auth.user?.user_metadata ?? {}) as { full_name?: string | null; phone?: string | null };
  const isGuest = (user.email ?? "").endsWith("@frontrow-guest.app");
  return (
    <div className="mt-4">
      {isGuest && <p className="notice mb-4">You are using FrontRow as a guest. Your profile is saved in this browser. Use Test sign-in from the menu if you want it on other devices too.</p>}
      <ProfileForm
        botName="liveshowradarbot"
        initial={{
          fullName: meta.full_name ?? "",
          phone: meta.phone ?? "",
          email: notif.email_address ?? "",
          emailOn: notif.email_enabled,
          chatId: notif.telegram_chat_id ?? "",
          telegramOn: notif.telegram_enabled,
        }}
      />
    </div>
  );
}
