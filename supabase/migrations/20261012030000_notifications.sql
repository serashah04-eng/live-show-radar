-- Step 5: retry timing + duplicate counting on notification_log, and per-user in-app alert dismissals.
alter table public.notification_log
  add column if not exists last_attempt_at timestamptz,
  add column if not exists duplicates_prevented int not null default 0;

create table if not exists public.alert_dismissals (
  user_id uuid not null references public.profiles(id) on delete cascade,
  phase_id uuid not null references public.ticket_phases(id) on delete cascade,
  dismissed_at timestamptz not null default now(),
  primary key (user_id, phase_id)
);
alter table public.alert_dismissals enable row level security;
create policy "own dismissals all" on public.alert_dismissals for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
