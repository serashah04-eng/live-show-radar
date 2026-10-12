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
      <h1 className="text-4xl sm:text-6xl">Who do you want alerts for?</h1>
      <p className="mt-2 muted">Tap artists to follow them. Pick your city. That is all.</p>

      <div className="mt-6"><CityPicker initial={initial.cities} compact /></div>

      <div className="mt-6">
        <ArtistPicker artists={artists} genres={genres} initialFollowed={initial.followed} mode="draft" />
      </div>

      <div className="sticky bottom-0 -mx-4 mt-6 flex flex-wrap items-center gap-3 border-t border-line bg-charcoal/95 px-4 py-3 backdrop-blur" aria-live="polite">
        <SubmitButton pendingText="Saving…">Save and open my newsroom</SubmitButton>
        <Link href="/" className="mono ml-auto underline underline-offset-2">Skip for now</Link>
        {state.error && <p className="notice-err w-full" role="alert">{state.error}</p>}
      </div>
    </form>
  );
}
