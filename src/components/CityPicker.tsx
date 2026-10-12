"use client";

import { useMemo, useState } from "react";
import { ALL_INDIA_CITIES, DEFAULT_CITY, INDIA_REGIONS } from "@/lib/catalog/cities";

/**
 * Pick cities by tapping, then order them: the first city is your top priority and its shows are listed
 * first; the next ones follow. The order is posted as repeated `cities` fields (first = #1).
 */
export function CityPicker({ initial, name = "cities" }: { initial: string[]; name?: string }) {
  const [order, setOrder] = useState<string[]>(initial.filter((c) => ALL_INDIA_CITIES.includes(c)));
  const [q, setQ] = useState("");
  const needle = q.trim().toLowerCase();

  const regions = useMemo(
    () => INDIA_REGIONS.map((r) => ({ ...r, cities: r.cities.filter((c) => !needle || c.toLowerCase().includes(needle)) })).filter((r) => r.cities.length > 0),
    [needle],
  );

  const add = (cities: string[]) => setOrder((o) => [...o, ...cities.filter((c) => !o.includes(c))]);
  const remove = (cities: string[]) => setOrder((o) => o.filter((c) => !cities.includes(c)));
  const makeFirst = (c: string) => setOrder((o) => [c, ...o.filter((x) => x !== c)]);
  const move = (c: string, by: -1 | 1) =>
    setOrder((o) => {
      const i = o.indexOf(c);
      const j = i + by;
      if (i < 0 || j < 0 || j >= o.length) return o;
      const next = [...o];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });

  return (
    <div>
      {order.map((c) => <input key={c} type="hidden" name={name} value={c} />)}

      <div className="rounded-2xl border border-line bg-surface p-4">
        <p className="mono">Your city priority (shows in #1 are listed first)</p>
        {order.length === 0 ? (
          <p className="mt-2 text-sm muted">No city picked yet. Tap cities below.</p>
        ) : (
          <ol className="mt-3 flex flex-wrap gap-2">
            {order.map((c, i) => (
              <li key={c} className={`flex items-center gap-1 rounded-full border py-1 pl-3 pr-1 text-sm ${i === 0 ? "border-lime bg-lime/15" : "border-line"}`}>
                <span className="mono !text-[10px]">#{i + 1}</span>
                <span className="font-semibold">{c}</span>
                {i > 0 && <button type="button" className="btn-ghost min-h-7 px-2 text-xs" onClick={() => makeFirst(c)} aria-label={`Make ${c} your top city`}>make #1</button>}
                <button type="button" className="min-h-7 px-2 text-xs muted hover:text-offwhite" onClick={() => move(c, -1)} disabled={i === 0} aria-label={`Move ${c} up`}>↑</button>
                <button type="button" className="min-h-7 px-2 text-xs muted hover:text-offwhite" onClick={() => move(c, 1)} disabled={i === order.length - 1} aria-label={`Move ${c} down`}>↓</button>
                <button type="button" className="min-h-7 px-2 text-xs text-orange" onClick={() => remove([c])} aria-label={`Remove ${c}`}>✕</button>
              </li>
            ))}
          </ol>
        )}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <label htmlFor="city-search" className="sr-only">Find a city</label>
        <input id="city-search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Find a city (optional)" className="field max-w-xs" />
        <button type="button" className="btn-ghost min-h-9 px-4" onClick={() => setOrder([DEFAULT_CITY])}>{DEFAULT_CITY} only</button>
        <button type="button" className="btn-ghost min-h-9 px-4" onClick={() => setOrder([DEFAULT_CITY, ...ALL_INDIA_CITIES.filter((c) => c !== DEFAULT_CITY)])}>All India</button>
        <button type="button" className="btn-ghost min-h-9 px-4" onClick={() => setOrder([])}>Clear</button>
      </div>
      <p className="mono mt-3" aria-live="polite">{order.length} of {ALL_INDIA_CITIES.length} cities selected</p>

      <div className="mt-3 space-y-5">
        {regions.map((r) => (
          <fieldset key={r.region}>
            <legend className="mb-2 flex w-full items-center gap-3">
              <span className="display text-xl">{r.region}</span>
              <button type="button" className="mono underline underline-offset-2" onClick={() => add(r.cities)}>all</button>
              <button type="button" className="mono underline underline-offset-2" onClick={() => remove(r.cities)}>none</button>
            </legend>
            <div className="flex flex-wrap gap-2">
              {r.cities.map((c) => {
                const on = order.includes(c);
                return (
                  <button
                    key={c}
                    type="button"
                    aria-pressed={on}
                    onClick={() => (on ? remove([c]) : add([c]))}
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
