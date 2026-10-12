import { Suspense } from "react";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { EventSubmitForm } from "./SubmitForm";

export default function SubmitPage() {
  return (
    <>
      <h1 className="text-4xl sm:text-5xl">Add event by link</h1>
      <p className="mt-2 max-w-2xl muted">
        Found a show on BookMyShow, District, SkillBox or an artist&apos;s page? Paste the link. It joins the feed as <strong>unconfirmed</strong> and
        becomes verified only after review. Nothing is fetched from the page automatically.
      </p>
      <Suspense fallback={<p className="mt-6 muted" role="status">Loading…</p>}>
        <Form />
      </Suspense>
    </>
  );
}

async function Form() {
  await requireUser();
  const sb = await createClient();
  const { data } = await sb.from("artists").select("name").order("name");
  return (
    <div className="mt-6">
      <EventSubmitForm artists={(data ?? []).map((a) => a.name)} />
    </div>
  );
}
