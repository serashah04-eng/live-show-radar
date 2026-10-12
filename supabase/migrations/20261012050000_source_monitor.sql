-- Step 7: live credible-source monitor, confidence labels, rate limits.
create table if not exists public.sources (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text not null,
  root_url text not null unique,
  tier int not null check (tier between 1 and 3),
  status text not null default 'verified',
  kind text not null check (kind in ('rss','sitemap')),
  feed_url text not null,
  active boolean not null default true,
  robots_ok boolean,
  robots_checked_at timestamptz,
  last_polled_at timestamptz,
  last_success_at timestamptz,
  last_error text,
  items_seen int not null default 0,
  items_relevant int not null default 0,
  events_created int not null default 0,
  notes jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.source_items (
  id uuid primary key default gen_random_uuid(),
  source_id uuid not null references public.sources(id) on delete cascade,
  url text not null,
  title text,
  published_at timestamptz,
  fetched_at timestamptz not null default now(),
  relevance_pass boolean not null default false,
  reasons jsonb not null default '[]'::jsonb,
  extracted jsonb,
  label text,
  high_priority boolean not null default false,
  event_id uuid references public.events(id) on delete set null,
  unique (source_id, url)
);
create index if not exists source_items_source_idx on public.source_items (source_id, fetched_at desc);

-- tiny key/value + fixed-window counters used by the public tick endpoint and abuse limits (service role only)
create table if not exists public.monitor_state (key text primary key, value text, updated_at timestamptz not null default now());
create table if not exists public.rate_limits (key text primary key, window_start timestamptz not null, count int not null default 0);

alter table public.events
  add column if not exists confidence_label text not null default 'unverified' check (confidence_label in ('confirmed','likely','unverified')),
  add column if not exists best_source_tier int,
  add column if not exists confirmed_by text,
  add column if not exists change_flag text check (change_flag in ('cancelled','postponed','rescheduled','venue_changed')),
  add column if not exists first_announced_at timestamptz;

update public.events set first_announced_at = discovered_at where first_announced_at is null;
update public.events set confidence_label = 'confirmed' where verification_status = 'verified' and confidence_label = 'unverified';
update public.events set confidence_label = 'likely' where corroborated and confidence_label = 'unverified';

alter table public.notification_preferences add column if not exists alert_unverified boolean not null default true;

alter table public.event_sources drop constraint if exists event_sources_discovery_source_check;
alter table public.event_sources add constraint event_sources_discovery_source_check
  check (discovery_source in ('gemini_grounding','ticketmaster','manual_submission','source_monitor','other'));

alter table public.sources enable row level security;
alter table public.source_items enable row level security;
alter table public.monitor_state enable row level security;
alter table public.rate_limits enable row level security;
drop policy if exists "read sources" on public.sources;
drop policy if exists "read source items" on public.source_items;
create policy "read sources" on public.sources for select to authenticated using (true);
create policy "read source items" on public.source_items for select to authenticated using (true);
