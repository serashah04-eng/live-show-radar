"use client";

import { useMemo, useState } from "react";
import { ALL_INDIA_CITIES, DEFAULT_CITY, INDIA_REGIONS } from "@/lib/catalog/cities";

/** Pick cities by tapping. Cities are grouped by region; every choice is posted as `cities`. */
export function CityPicker({ initial, name = "cities" }: { initial: string[]; name?: string }) {
  const [selected, setSelected] = useState<Set<string>>(new Set(initial.filter((c) => ALL_INDIA_CITIES.includes(c))));
  const [q, setQ] = useState("");
  const needle = q.trim().toLowerCase();

  const regions = useMemo(
    () =>
      INDIA_REGIONS.map((r) => ({ ...r, cities: r.cities.filter((c) => !needle || c.toLowerCase().includes(needle)) })).filter((r) => r.cities.length > 0),
    [needle],
  );

  const set = (cities: string[], on: boolean) =>
    setSelected((prev) => {
      const next = new Set(prev);
      for (const c of cities) {
        if (on) next.add(c);
        else next.delete(c);
      }
      return next;
    });

  return (
    <div>
      {[...selected].map((c) => <input key={c} type="hidden" name={name} value={c} />)}
      <div className="flex flex-wrap items-center gap-2">
        <label htmlFor="city-search" className="sr-only">Find a city</label>
        <input id="city-search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Find a city (optional)" className="field max-w-xs" />
        <button type="button" className="btn-ghost min-h-9 px-4" onClick={() => setSelected(new Set([DEFAULT_CITY]))}>{DEFAULT_CITY} only</button>
        <button type="button" className="btn-ghost min-h-9 px-4" onClick={() => setSelected(new Set(ALL_INDIA_CITIES))}>All India</button>
        <button type="button" className="btn-ghost min-h-9 px-4" onClick={() => setSelected(new Set())}>Clear</button>
      </div>
      <p className="mono mt-3" aria-live="polite">{selected.size} of {ALL_INDIA_CITIES.length} cities selected · priority cities are listed first in your feed</p>

      <div className="mt-3 space-y-5">
        {regions.map((r) => (
          <fieldset key={r.region}>
            <legend className="mb-2 flex w-full items-center gap-3">
              <span className="display text-xl">{r.region}</span>
              <button type="button" className="mono underline underline-offset-2" onClick={() => set(r.cities, true)}>all</button>
              <button type="button" className="mono underline underline-offset-2" onClick={() => set(r.cities, false)}>none</button>
            </legend>
            <div className="flex flex-wrap gap-2">
              {r.cities.map((c) => {
                const on = selected.has(c);
                return (
                  <button
                    key={c}
                    type="button"
                    aria-pressed={on}
                    onClick={() => set([c], !on)}
                    className={`chip ${on ? "!border-lime !bg-lime font-semibold !text-charcoal" : ""}`}
                  >
                    {c}
                  </button>
                );
              })}
            </div>
          </fieldset>
        ))}
        {regions.length === 0 && <p className="card muted">No city matches &ldquo;{q}&rdquo;.</p>}
      </div>
    </div>
  );
}
