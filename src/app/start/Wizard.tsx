"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { ArtistPicker, type PickerArtist, type PickerGenre } from "@/components/ArtistPicker";
import { CityPicker } from "@/components/CityPicker";
import { SubmitButton } from "@/components/SubmitButton";
import { saveOnboarding, type StartState } from "./actions";

interface GenreOpt extends PickerGenre {
  id: number;
}

const STEPS = ["Your sound", "Your cities", "Your artists"];

export function Wizard({
  genres,
  artists,
  initial,
}: {
  genres: GenreOpt[];
  artists: PickerArtist[];
  initial: { allGenres: boolean; genreSlugs: string[]; cities: string[]; followed: string[] };
}) {
  const [step, setStep] = useState(0);
  const [allGenres, setAllGenres] = useState(initial.allGenres || initial.genreSlugs.length === 0);
  const [picked, setPicked] = useState<Set<string>>(new Set(initial.genreSlugs));
  const [state, action] = useActionState<StartState, FormData>(saveOnboarding, {});

  const toggleGenre = (slug: string) => {
    setAllGenres(false);
    setPicked((p) => {
      const n = new Set(p);
      if (n.has(slug)) n.delete(slug);
      else n.add(slug);
      return n;
    });
  };
  const chosenGenres = allGenres ? [] : [...picked];

  return (
    <form action={action}>
      {/* every step stays mounted (just hidden) so all choices are always submitted */}
      {allGenres && <input type="hidden" name="all_genres" value="1" />}
      {!allGenres && genres.filter((g) => picked.has(g.slug)).map((g) => <input key={g.slug} type="hidden" name="genres" value={g.id} />)}

      <div className="mb-6">
        <p className="mono">Step {step + 1} of 3 · {STEPS[step]}</p>
        <div className="mt-2 grid grid-cols-3 gap-1" aria-hidden="true">
          {STEPS.map((s, i) => <span key={s} className={`h-1 rounded-full ${i <= step ? "bg-lime" : "bg-line"}`} />)}
        </div>
      </div>

      <section hidden={step !== 0} aria-label="Choose genres">
        <h2 className="text-4xl sm:text-5xl">What do you listen to?</h2>
        <p className="mt-2 muted">Tap any number. A show matches if it fits any of them. Or keep every genre.</p>
        <div className="mt-5 flex flex-wrap gap-2">
          <button type="button" aria-pressed={allGenres} onClick={() => { setAllGenres(true); setPicked(new Set()); }}
            className={`chip ${allGenres ? "!border-lime !bg-lime font-semibold !text-charcoal" : ""}`}>
            All genres
          </button>
          {genres.map((g) => {
            const on = !allGenres && picked.has(g.slug);
            return (
              <button key={g.slug} type="button" aria-pressed={on} onClick={() => toggleGenre(g.slug)}
                className={`chip ${on ? "!border-lime !bg-lime font-semibold !text-charcoal" : ""}`}>
                {g.name}
              </button>
            );
          })}
        </div>
      </section>

      <section hidden={step !== 1} aria-label="Choose cities">
        <h2 className="text-4xl sm:text-5xl">Where can you go?</h2>
        <p className="mt-2 muted">Bengaluru is picked for you. Add any other cities, or tap All India. Shows elsewhere are never hidden unless you turn that off later.</p>
        <div className="mt-5"><CityPicker initial={initial.cities} /></div>
      </section>

      <section hidden={step !== 2} aria-label="Choose artists">
        <h2 className="text-4xl sm:text-5xl">Who do you follow?</h2>
        <p className="mt-2 muted">Tap an artist to follow them. You can change this any time.</p>
        <div className="mt-5">
          <ArtistPicker artists={artists} genres={genres} initialFollowed={initial.followed} mode="draft" myGenres={chosenGenres} />
        </div>
      </section>

      <div className="mt-8 flex flex-wrap items-center gap-3 border-t border-line pt-5" aria-live="polite">
        {step > 0 && <button type="button" className="btn-ghost" onClick={() => setStep(step - 1)}>Back</button>}
        {step < 2 && <button type="button" className="btn-primary arrow" onClick={() => setStep(step + 1)}>Next</button>}
        {step === 2 && <SubmitButton pendingText="Saving…">Save and open my radar</SubmitButton>}
        <Link href="/" className="mono ml-auto underline underline-offset-2">Skip for now</Link>
        {state.error && <p className="notice-err w-full" role="alert">{state.error}</p>}
      </div>
    </form>
  );
}
