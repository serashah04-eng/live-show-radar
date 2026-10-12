"use client";

import Link from "next/link";
import { useActionState } from "react";
import { ArtistPicker, type PickerArtist, type PickerGenre } from "@/components/ArtistPicker";
import { CityPicker } from "@/components/CityPicker";
import { SubmitButton } from "@/components/SubmitButton";
import { saveOnboarding, type StartState } from "./actions";

interface GenreOpt extends PickerGenre {
  id: number;
}

/** One page, no steps: who you follow, and which city comes first. Genres are only a filter inside the artist list. */
export function Wizard({
  genres,
  artists,
  initial,
}: {
  genres: GenreOpt[];
  artists: PickerArtist[];
  initial: { allGenres: boolean; genreSlugs: string[]; cities: string[]; followed: string[] };
}) {
  const [state, action] = useActionState<StartState, FormData>(saveOnboarding, {});
  return (
    <form action={action}>
      <input type="hidden" name="all_genres" value="1" />
      <h1>Pick your scene</h1>
      <p className="mt-1 text-sm muted">Choose your cities on the left and your artists on the right.</p>

      <div className="mt-4 grid gap-6 lg:grid-cols-[17rem_1fr]">
        <div className="rounded-xl border border-line bg-surface p-3 lg:sticky lg:top-3 lg:self-start"><CityPicker initial={initial.cities} compact /></div>
        <div><ArtistPicker artists={artists} genres={genres} initialFollowed={initial.followed} mode="draft" /></div>
      </div>

      <div className="sticky bottom-0 -mx-4 mt-6 flex flex-wrap items-center gap-3 border-t border-line bg-charcoal/95 px-4 py-3 backdrop-blur" aria-live="polite">
        <SubmitButton pendingText="Saving…">Save and open my newsroom</SubmitButton>
        <Link href="/" className="mono ml-auto underline underline-offset-2">Skip for now</Link>
        {state.error && <p className="notice-err w-full" role="alert">{state.error}</p>}
      </div>
    </form>
  );
}
