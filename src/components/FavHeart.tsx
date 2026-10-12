"use client";

import { useState, useTransition } from "react";
import { setFollow } from "@/app/artists/actions";

/** One-tap favourite for an artist: a heart that fills instantly and saves in the background. */
export function FavHeart({ artistId, name, initial, className = "" }: { artistId: string; name: string; initial: boolean; className?: string }) {
  const [on, setOn] = useState(initial);
  const [pop, setPop] = useState(false);
  const [, startTransition] = useTransition();
  const flip = () => {
    const next = !on;
    setOn(next);
    setPop(true);
    setTimeout(() => setPop(false), 400);
    startTransition(async () => {
      const r = await setFollow(artistId, next);
      if (!r.ok) setOn(!next); // the save did not go through: undo
    });
  };
  return (
    <button
      type="button"
      onClick={flip}
      aria-pressed={on}
      aria-label={on ? `Remove ${name} from favourites` : `Add ${name} to favourites`}
      title={on ? "In your favourites" : "Add to favourites"}
      className={`heart grid size-8 place-items-center rounded-full border text-base leading-none transition ${on ? "border-orange bg-orange text-ink" : "border-line bg-black/30 text-white hover:border-orange"} ${pop ? "heart-pop" : ""} ${className}`}
    >
      <span aria-hidden="true">{on ? "♥" : "♡"}</span>
    </button>
  );
}
