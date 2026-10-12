-- Hybrid verification: events can be "corroborated" automatically when two independent
-- websites report the same artist + city + date. Corroborated is NOT verified: it only
-- unlocks "reported, not confirmed" alerts. Verified still requires an official API record
-- or an owner review with evidence.
alter table public.events
  add column if not exists corroborated boolean not null default false,
  add column if not exists corroborated_at timestamptz,
  add column if not exists reviewed_note text;
