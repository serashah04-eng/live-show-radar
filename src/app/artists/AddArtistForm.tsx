"use client";

import { useActionState } from "react";
import { SubmitButton } from "@/components/SubmitButton";
import { addArtist, type AddArtistState } from "./actions";

export function AddArtistForm({ genres }: { genres: { id: number; name: string }[] }) {
  const [state, action] = useActionState<AddArtistState, FormData>(addArtist, {});
  return (
    <form action={action} className="card space-y-4" aria-label="Add an artist">
      <h2 className="text-2xl">Add an artist</h2>
      <p className="text-sm muted">Can&apos;t find them? Add them with any other names they perform under, so matching catches every spelling.</p>
      <div>
        <label className="label" htmlFor="name">Artist name</label>
        <input id="name" name="name" required minLength={2} maxLength={80} className="field" />
      </div>
      <div>
        <label className="label" htmlFor="aliases">Other names / spellings (comma-separated)</label>
        <input id="aliases" name="aliases" placeholder="e.g. WCMT, When Chai Met Toast" className="field" />
      </div>
      <div>
        <label className="label" htmlFor="origin">Type</label>
        <select id="origin" name="origin" className="field" defaultValue="indian_indie">
          <option value="indian_indie">Indian indie</option>
          <option value="bollywood">Bollywood</option>
          <option value="international">International</option>
          <option value="other">Other</option>
        </select>
      </div>
      <fieldset>
        <legend className="label">Genres (optional)</legend>
        <div className="flex flex-wrap gap-2">
          {genres.map((g) => (
            <label key={g.id} className="chip">
              <input type="checkbox" name="genres" value={g.id} />
              {g.name}
            </label>
          ))}
        </div>
      </fieldset>
      <div aria-live="polite">
        {state.error && <p className="notice-err" role="alert">{state.error}</p>}
        {state.message && <p className="notice-ok">{state.message}</p>}
      </div>
      <SubmitButton pendingText="Adding…">Add and follow</SubmitButton>
    </form>
  );
}
