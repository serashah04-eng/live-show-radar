"use client";

import { useActionState } from "react";
import { addArtist, type AddArtistState } from "@/app/artists/actions";
import { SubmitButton } from "@/components/SubmitButton";

/** One tap: add an artist we do not have yet to Favourites so we start watching for their India shows. */
export function TrackArtist({ name }: { name: string }) {
  const [state, action] = useActionState<AddArtistState, FormData>(addArtist, {});
  return (
    <form action={action} className="mt-3">
      <input type="hidden" name="name" value={name} />
      <input type="hidden" name="origin" value="other" />
      <SubmitButton pendingText="Adding…">Add &ldquo;{name}&rdquo; to favourites and watch for shows</SubmitButton>
      <div aria-live="polite" className="mt-2">
        {state.error && <p className="notice-err" role="alert">{state.error}</p>}
        {state.message && <p className="notice-ok">{state.message}</p>}
      </div>
    </form>
  );
}
