"use client";

import { useMemo, useState } from "react";
import { ALL_INDIA_CITIES, DEFAULT_CITY, INDIA_REGIONS } from "@/lib/catalog/cities";

const TOP = ["Bengaluru", "Mumbai", "Delhi", "Hyderabad", "Chennai", "Pune", "Kolkata", "Goa", "Ahmedabad", "Jaipur"];

/**
 * Tap cities. The FIRST one you tap is your top priority (shown with a number); the rest follow in tap order.
 * Posted as repeated `cities` fields. `compact` shows only the main metros plus a "More cities" drawer.
 */
export function CityPicker({ initial, name = "cities", compact = false }: { initial: string[]; name?: string; compact?: boolean }) {
  const [order, setOrder] = useState<string[]>(initial.length ? initial.filter((c) => ALL_INDIA_CITIES.includes(c)) : [DEFAULT_CITY]);
  const [q, setQ] = useState("");
  const needle = q.trim().toLowerCase();
  const toggle = (c: string) => setOrder((o) => (o.includes(c) ? o.filter((x) => x !== c) : [...o, c]));
  const makeFirst = (c: string) => setOrder((o) => [c, ...o.filter((x) => x !== c)]);
  const more = useMemo(() => ALL_INDIA_CITIES.filter((c) => !TOP.includes(c) && (!needle || c.toLowerCase().includes(needle))), [needle]);

  const chip = (c: string) => {
    const i = order.indexOf(c);
    const on = i >= 0;
    return (
      <button key={c} type="button" aria-pressed={on} onClick={() => toggle(c)} className={`chip ${on ? "!border-lime !bg-lime font-semibold !text-ink" : ""}`}>
        {on && <span className="mr-1 text-[10px]">#{i + 1}</span>}{c}
      </button>
    );
  };

  return (
    <div>
      {order.map((c) => <input key={c} type="hidden" name={name} value={c} />)}
      <p className="mono mb-2">Your cities{order.length > 1 ? ` · #1 is ${order[0]}` : ""}</p>
      <div className="flex flex-wrap items-center gap-2">
        {TOP.map(chip)}
        <button type="button" className="chip" onClick={() => setOrder([DEFAULT_CITY, ...ALL_INDIA_CITIES.filter((c) => c !== DEFAULT_CITY)])}>All India</button>
      </div>
      {order.length > 1 && (
        <p className="mt-2 text-xs muted">
          Want a different #1?{" "}
          {order.slice(1, 4).map((c) => <button key={c} type="button" className="mr-2 underline underline-offset-2" onClick={() => makeFirst(c)}>make {c} #1</button>)}
        </p>
      )}
      <div className="mt-3">
        <label htmlFor="city-search" className="sr-only">Search cities</label>
        <input id="city-search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search any city" className="field !min-h-8 !text-xs" />
        <div className={`mt-2 flex flex-wrap gap-1.5 overflow-y-auto ${compact ? "max-h-32" : "max-h-72"}`}>
          {(needle ? more : more.slice(0, compact ? 24 : more.length)).map(chip)}
          {more.length === 0 && <p className="muted text-xs">No city matches &ldquo;{q}&rdquo;.</p>}
        </div>
        <p className="mono mt-2">{order.length} selected · {INDIA_REGIONS.length} regions, {ALL_INDIA_CITIES.length} cities</p>
      </div>
    </div>
  );
}
