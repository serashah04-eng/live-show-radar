"use client";

import { useActionState } from "react";
import { SubmitButton } from "@/components/SubmitButton";
import { CityPicker } from "@/components/CityPicker";
import type { NotificationPrefs } from "@/lib/data";
import type { Prefs } from "@/lib/feed";
import { saveSettings, type SettingsState } from "./actions";

function Toggle({ name, label, hint, defaultChecked }: { name: string; label: string; hint?: string; defaultChecked: boolean }) {
  return (
    <label className="flex cursor-pointer items-start gap-3 py-1">
      <input type="checkbox" name={name} defaultChecked={defaultChecked} className="mt-1 size-5 accent-[#315cff]" />
      <span>
        <span className="block text-sm font-semibold">{label}</span>
        {hint && <span className="block text-xs muted">{hint}</span>}
      </span>
    </label>
  );
}

export function SettingsForm({
  prefs,
  notif,
  genres,
  selectedGenreIds,
}: {
  prefs: Prefs;
  notif: NotificationPrefs;
  genres: { id: number; name: string }[];
  selectedGenreIds: number[];
}) {
  const [state, action] = useActionState<SettingsState, FormData>(saveSettings, {});

  return (
    <form action={action} className="space-y-8">
      <details className="card space-y-4" aria-labelledby="g" open={!prefs.allGenres}>
        <summary id="g" className="cursor-pointer text-2xl font-bold">Genres <span className="text-sm font-normal muted">(optional · {prefs.allGenres ? "all genres" : selectedGenreIds.length + " picked"})</span></summary>
        <Toggle name="all_genres" label="All genres" hint="Show every concert regardless of genre. Untick to pick genres below." defaultChecked={prefs.allGenres} />
        <fieldset>
          <legend className="label">Pick any number (a concert matches if it fits any selected genre)</legend>
          <div className="flex flex-wrap gap-2">
            {genres.map((g) => (
              <label key={g.id} className="chip">
                <input type="checkbox" name="genres" value={g.id} defaultChecked={selectedGenreIds.includes(g.id)} />
                {g.name}
              </label>
            ))}
          </div>
        </fieldset>
        <Toggle
          name="strict_genre_mode"
          label="Strict genre-only mode"
          hint="Off (recommended): artists you follow always show up, even with no genre data. On: only selected genres show."
          defaultChecked={prefs.strictGenreMode}
        />
      </details>

      <section className="card space-y-4" aria-labelledby="c">
        <h2 id="c" className="text-2xl">Cities</h2>
        <CityPicker initial={prefs.cities} compact />
        <Toggle
          name="show_other_cities"
          label="Also show other Indian cities"
          hint="On (recommended): Bengaluru stays first but a Mumbai or Chennai show is never hidden."
          defaultChecked={prefs.showOtherCities}
        />
      </section>

      <section className="card space-y-4" aria-labelledby="n">
        <h2 id="n" className="text-2xl">Alerts</h2>
        <p className="text-sm muted">Channels are independent: switching Telegram off never switches email off.</p>
        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-3">
            <Toggle name="telegram_enabled" label="Telegram" defaultChecked={notif.telegram_enabled} />
            <div>
              <label className="label" htmlFor="telegram_chat_id">Telegram chat ID</label>
              <input id="telegram_chat_id" name="telegram_chat_id" inputMode="numeric" defaultValue={notif.telegram_chat_id ?? ""} className="field" />
              <p className="mt-1 text-xs muted">Leave empty to use the owner chat configured on the server.</p>
            </div>
          </div>
          <div className="space-y-3">
            <Toggle name="email_enabled" label="Email" defaultChecked={notif.email_enabled} />
            <div>
              <label className="label" htmlFor="email_address">Email address</label>
              <input id="email_address" name="email_address" type="email" defaultValue={notif.email_address ?? ""} className="field" />
            </div>
          </div>
        </div>
        <div className="border-t border-line pt-3">
          <p className="label">What to alert about</p>
          <Toggle name="new_concert_alerts" label="New concerts" hint="Labelled “reported, not confirmed” unless verified." defaultChecked={notif.new_concert_alerts} />
          <Toggle name="early_bird_alerts" label="Verified early-bird phases" hint="Urgent alerts only when the phase and its evidence are verified." defaultChecked={notif.early_bird_alerts} />
          <Toggle name="deadline_reminders" label="Deadline reminders" hint="Only for deadlines confirmed with evidence." defaultChecked={notif.deadline_reminders} />
        </div>
      </section>

      <div className="sticky bottom-3 flex flex-wrap items-center gap-3 rounded-2xl border border-line bg-charcoal/95 p-3 backdrop-blur" aria-live="polite">
        <SubmitButton pendingText="Saving…">Save settings</SubmitButton>
        {state.saved && <p className="notice-ok !py-2">{state.saved}</p>}
        {state.error && <p className="notice-err !py-2" role="alert">{state.error}</p>}
      </div>
    </form>
  );
}
