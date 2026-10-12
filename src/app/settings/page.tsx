import { Suspense } from "react";
import { requireUser } from "@/lib/auth";
import { loadGenres, loadPrefs } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";
import { SettingsForm } from "./SettingsForm";

export default function SettingsPage() {
  return (
    <>
      <h1 className="text-4xl sm:text-5xl">Settings</h1>
      <p className="mt-2 max-w-2xl muted">Saved to your account, so they follow you across devices and sessions.</p>
      <Suspense fallback={<p className="mt-6 muted" role="status">Loading settings…</p>}>
        <Settings />
      </Suspense>
    </>
  );
}

async function Settings() {
  const user = await requireUser();
  const sb = await createClient();
  const [{ prefs, notif }, genres] = await Promise.all([loadPrefs(sb, user.id), loadGenres(sb)]);
  const selected = genres.filter((g) => prefs.genreSlugs.includes(g.slug)).map((g) => g.id);
  return (
    <div className="mt-6">
      <SettingsForm prefs={prefs} notif={notif} genres={genres} selectedGenreIds={selected} />
    </div>
  );
}
