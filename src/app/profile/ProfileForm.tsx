"use client";

import { useActionState } from "react";
import { SubmitButton } from "@/components/SubmitButton";
import { saveProfile, sendProfileTest, type ProfileState } from "./actions";

export interface ProfileInitial {
  fullName: string;
  phone: string;
  email: string;
  emailOn: boolean;
  chatId: string;
  telegramOn: boolean;
}

export function ProfileForm({ initial, botName }: { initial: ProfileInitial; botName: string }) {
  const [state, action] = useActionState<ProfileState, FormData>(saveProfile, {});
  const [test, testAction] = useActionState<ProfileState>(sendProfileTest, {});
  return (
    <div className="space-y-4">
      <form action={action} className="space-y-4">
        <section className="card space-y-3" aria-labelledby="who">
          <h2 id="who">About you</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="full_name">Name</label>
              <input id="full_name" name="full_name" defaultValue={initial.fullName} maxLength={80} autoComplete="name" className="field" placeholder="Your name" />
            </div>
            <div>
              <label className="label" htmlFor="phone">Phone number</label>
              <input id="phone" name="phone" type="tel" defaultValue={initial.phone} autoComplete="tel" className="field" placeholder="+91 98765 43210" />
              <p className="mt-1 text-xs muted">Saved on your profile. Alerts are not sent by SMS or WhatsApp yet; this is for when we add it.</p>
            </div>
          </div>
        </section>

        <section className="card space-y-4" aria-labelledby="where">
          <h2 id="where">Where should alerts go?</h2>
          <div className="grid gap-5 md:grid-cols-2">
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" name="email_enabled" defaultChecked={initial.emailOn} /> Email</label>
              <label className="label" htmlFor="email_address">Email address</label>
              <input id="email_address" name="email_address" type="email" defaultValue={initial.email} autoComplete="email" className="field" placeholder="you@example.com" />
            </div>
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" name="telegram_enabled" defaultChecked={initial.telegramOn} /> Telegram</label>
              <label className="label" htmlFor="telegram_chat_id">Telegram chat ID</label>
              <input id="telegram_chat_id" name="telegram_chat_id" inputMode="numeric" defaultValue={initial.chatId} className="field" placeholder="123456789" />
              <ol className="list-decimal space-y-0.5 pl-5 text-xs muted">
                <li>Open Telegram and start <a className="text-lime underline" href={`https://t.me/${botName}`} target="_blank" rel="noopener noreferrer">@{botName}</a> (press Start).</li>
                <li>Message <a className="text-lime underline" href="https://t.me/userinfobot" target="_blank" rel="noopener noreferrer">@userinfobot</a>; it replies with your numeric ID.</li>
                <li>Paste that number here and save.</li>
              </ol>
            </div>
          </div>
          <p className="text-xs muted">Pop-ups: when an early-bird deadline is confirmed, a pop-up also appears the next time you open FrontRow, once per show.</p>
        </section>

        <div className="flex flex-wrap items-center gap-3" aria-live="polite">
          <SubmitButton pendingText="Saving…">Save profile</SubmitButton>
          {state.saved && <p className="notice-ok !py-2">{state.saved}</p>}
          {state.error && <p className="notice-err !py-2" role="alert">{state.error}</p>}
        </div>
      </form>

      <form action={testAction} className="card flex flex-wrap items-center gap-3" aria-live="polite">
        <div className="min-w-0 flex-1">
          <p className="font-semibold">Send me a test alert</p>
          <p className="text-xs muted">Sends a clearly labelled sample (not a real concert) to the saved details above. Save first.</p>
        </div>
        <SubmitButton pendingText="Sending…">Send test alert</SubmitButton>
        {test.saved && <p className="notice-ok w-full !py-2">{test.saved}</p>}
        {test.error && <p className="notice-err w-full !py-2" role="alert">{test.error}</p>}
      </form>
    </div>
  );
}
