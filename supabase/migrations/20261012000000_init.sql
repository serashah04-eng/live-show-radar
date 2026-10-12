-- Live Show Radar: initial schema. Additive only (the project had 0 tables).
-- Writes to shared tables happen server-side with the secret key (bypasses RLS).
-- Browsers only get the policies below.

create extension if not exists pgcrypto;

-- ---------- helpers ----------
create or replace function public.set_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin new.updated_at = now(); return new; end $$;

-- ---------- users ----------
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  is_admin boolean not null default false,
  timezone text not null default 'Asia/Kolkata',
  created_at timestamptz not null default now()
);

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, display_name) values (new.id, split_part(coalesce(new.email,''), '@', 1));
  insert into public.user_preferences (user_id) values (new.id);
  insert into public.notification_preferences (user_id, email_address) values (new.id, new.email);
  return new;
end $$;

-- ---------- taxonomy ----------
create table public.genres (
  id serial primary key,
  slug text not null unique,
  name text not null
);

create table public.artists (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  normalized_name text not null unique,
  origin text check (origin in ('indian_indie','bollywood','international','other')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table public.artist_aliases (
  id uuid primary key default gen_random_uuid(),
  artist_id uuid not null references public.artists(id) on delete cascade,
  alias text not null,
  normalized_alias text not null,
  unique (artist_id, normalized_alias)
);
create index artist_aliases_norm_idx on public.artist_aliases (normalized_alias);

create table public.artist_genres (
  artist_id uuid not null references public.artists(id) on delete cascade,
  genre_id int not null references public.genres(id) on delete cascade,
  primary key (artist_id, genre_id)
);

-- ---------- user preferences ----------
create table public.user_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  all_genres boolean not null default true,
  strict_genre_mode boolean not null default false,   -- false: followed artists stay visible even without genre metadata
  cities text[] not null default array['Bengaluru'],  -- priority cities
  show_other_indian_cities boolean not null default true,
  updated_at timestamptz not null default now()
);
create trigger user_preferences_updated before update on public.user_preferences
  for each row execute function public.set_updated_at();

create table public.user_genres (
  user_id uuid not null references auth.users(id) on delete cascade,
  genre_id int not null references public.genres(id) on delete cascade,
  primary key (user_id, genre_id)
);

create table public.user_artist_follows (
  user_id uuid not null references auth.users(id) on delete cascade,
  artist_id uuid not null references public.artists(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, artist_id)
);

create table public.notification_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  telegram_enabled boolean not null default true,
  telegram_chat_id text,
  email_enabled boolean not null default true,
  email_address text,
  new_concert_alerts boolean not null default true,
  early_bird_alerts boolean not null default true,
  deadline_reminders boolean not null default true,
  updated_at timestamptz not null default now()
);
create trigger notification_preferences_updated before update on public.notification_preferences
  for each row execute function public.set_updated_at();

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- events ----------
create table public.events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  starts_at timestamptz,                         -- null when only text/month is known
  date_text text,                                -- date exactly as stated by the source
  date_precision text not null default 'unknown' check (date_precision in ('exact','day','month','unknown')),
  venue text,
  city text,
  timezone text not null default 'Asia/Kolkata',
  ticket_url text,
  ticket_status text not null default 'unknown'
    check (ticket_status in ('upcoming','tickets_available','early_bird_announced','early_bird_ending_soon','sold_out','unknown')),
  verification_status text not null default 'pending_verification'
    check (verification_status in ('pending_verification','verified','rejected','cancelled','stale')),
  has_conflict boolean not null default false,   -- sources disagree
  is_sample boolean not null default false,      -- clearly labelled sample data
  dedupe_key text not null unique,               -- normalized artist|city|date-bucket
  discovered_at timestamptz not null default now(),
  last_checked_at timestamptz,
  verified_at timestamptz,
  verified_by uuid references auth.users(id),
  updated_at timestamptz not null default now()
);
create index events_status_idx on public.events (verification_status);
create index events_city_idx on public.events (city);
create index events_starts_idx on public.events (starts_at);
create trigger events_updated before update on public.events
  for each row execute function public.set_updated_at();

create table public.event_artists (
  event_id uuid not null references public.events(id) on delete cascade,
  artist_id uuid not null references public.artists(id) on delete cascade,
  match_method text not null check (match_method in ('exact','alias','ai_assisted','manual')),
  confidence numeric(3,2) not null default 1.00,
  matched_text text,
  primary key (event_id, artist_id)
);
create index event_artists_artist_idx on public.event_artists (artist_id);

create table public.event_sources (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  discovery_source text not null check (discovery_source in ('gemini_grounding','ticketmaster','manual_submission','other')),
  source_url text not null,
  source_title text,
  external_id text,
  discovered_at timestamptz not null default now(),
  last_checked_at timestamptz,
  unique (event_id, source_url)
);

create table public.event_evidence (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  source_id uuid references public.event_sources(id) on delete set null,
  kind text not null check (kind in ('event_details','ticket_phase','deadline','cancellation')),
  evidence_url text not null,
  excerpt text,                                  -- text that explicitly supports the detail
  checked_at timestamptz not null default now(),
  checked_by uuid references auth.users(id)      -- null = automated, set = human reviewer
);

create table public.ticket_phases (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  phase text not null check (phase in ('early_bird','phase_1','phase_2','general','door')),
  starts_at timestamptz,
  ends_at timestamptz,                           -- null = deadline unknown. Never guessed.
  price_text text,
  verification_status text not null default 'unverified' check (verification_status in ('unverified','verified')),
  evidence_id uuid references public.event_evidence(id),
  verified_at timestamptz,
  created_at timestamptz not null default now(),
  check (verification_status = 'unverified' or evidence_id is not null)
);

-- ---------- notifications & monitoring ----------
create table public.notification_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  event_id uuid references public.events(id) on delete set null,
  phase_id uuid references public.ticket_phases(id) on delete set null,
  notification_type text not null check (notification_type in ('new_concert','early_bird_verified','deadline_reminder','status_change','test')),
  channel text not null check (channel in ('telegram','email')),
  recipient text not null,
  dedupe_key text not null,
  status text not null default 'pending' check (status in ('pending','sent','failed','duplicate_prevented')),
  attempt_count int not null default 0,
  error text,
  provider_ref text,
  created_at timestamptz not null default now(),
  sent_at timestamptz,
  unique (dedupe_key, channel, recipient)
);
create index notification_log_status_idx on public.notification_log (status);

create table public.discovery_runs (
  id uuid primary key default gen_random_uuid(),
  source_name text not null,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  status text not null default 'running' check (status in ('running','success','partial','failed')),
  events_found int not null default 0,
  events_new int not null default 0,
  error text
);

-- ---------- Row Level Security ----------
alter table public.profiles enable row level security;
alter table public.genres enable row level security;
alter table public.artists enable row level security;
alter table public.artist_aliases enable row level security;
alter table public.artist_genres enable row level security;
alter table public.user_preferences enable row level security;
alter table public.user_genres enable row level security;
alter table public.user_artist_follows enable row level security;
alter table public.notification_preferences enable row level security;
alter table public.events enable row level security;
alter table public.event_artists enable row level security;
alter table public.event_sources enable row level security;
alter table public.event_evidence enable row level security;
alter table public.ticket_phases enable row level security;
alter table public.notification_log enable row level security;
alter table public.discovery_runs enable row level security;

-- own-row access
create policy "own profile read" on public.profiles for select to authenticated using (id = (select auth.uid()));
create policy "own profile update" on public.profiles for update to authenticated using (id = (select auth.uid()))
  with check (id = (select auth.uid()) and is_admin = (select p.is_admin from public.profiles p where p.id = (select auth.uid())));

create policy "own prefs all" on public.user_preferences for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "own genres all" on public.user_genres for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "own follows all" on public.user_artist_follows for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "own notif prefs all" on public.notification_preferences for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "own notification log read" on public.notification_log for select to authenticated
  using (user_id = (select auth.uid()));

-- shared read-only data for signed-in users (writes are server-side only)
create policy "read genres" on public.genres for select to authenticated using (true);
create policy "read artists" on public.artists for select to authenticated using (true);
create policy "read aliases" on public.artist_aliases for select to authenticated using (true);
create policy "read artist genres" on public.artist_genres for select to authenticated using (true);
create policy "read events" on public.events for select to authenticated using (verification_status <> 'rejected');
create policy "read event artists" on public.event_artists for select to authenticated using (true);
create policy "read event sources" on public.event_sources for select to authenticated using (true);
create policy "read evidence" on public.event_evidence for select to authenticated using (true);
create policy "read phases" on public.ticket_phases for select to authenticated using (true);
create policy "read discovery runs" on public.discovery_runs for select to authenticated using (true);

-- ---------- seed: taxonomy + starter artists (real artists, NO events) ----------
insert into public.genres (slug, name) values
  ('indie','Indie'),('indie-folk','Indie Folk'),('indie-rock','Indie Rock'),('indie-pop','Indie Pop'),
  ('bollywood','Bollywood'),('electronic','Electronic'),('hip-hop','Hip-Hop'),('rock','Rock'),
  ('pop','Pop'),('folk-fusion','Folk Fusion'),('jazz','Jazz'),('international','International');

insert into public.artists (name, normalized_name, origin) values
  ('Prateek Kuhad','prateek kuhad','indian_indie'),
  ('Anuv Jain','anuv jain','indian_indie'),
  ('When Chai Met Toast','when chai met toast','indian_indie'),
  ('The Local Train','the local train','indian_indie'),
  ('Peter Cat Recording Co','peter cat recording co','indian_indie');

insert into public.artist_aliases (artist_id, alias, normalized_alias)
select a.id, v.alias, v.norm from (values
  ('prateek kuhad','Prateek Kuhad','prateek kuhad'),
  ('anuv jain','Anuv Jain','anuv jain'),
  ('when chai met toast','WCMT','wcmt'),
  ('when chai met toast','When Chai Met Toast','when chai met toast'),
  ('the local train','TLT','tlt'),
  ('the local train','The Local Train','the local train'),
  ('peter cat recording co','Peter Cat','peter cat'),
  ('peter cat recording co','Peter Cat Recording Company','peter cat recording company')
) as v(artist_norm, alias, norm) join public.artists a on a.normalized_name = v.artist_norm;

insert into public.artist_genres (artist_id, genre_id)
select a.id, g.id from (values
  ('prateek kuhad','indie-folk'),('prateek kuhad','indie'),
  ('anuv jain','indie-pop'),('anuv jain','indie'),
  ('when chai met toast','indie-pop'),('when chai met toast','indie'),
  ('the local train','indie-rock'),('the local train','rock'),
  ('peter cat recording co','indie'),('peter cat recording co','jazz')
) as v(artist_norm, genre_slug)
join public.artists a on a.normalized_name = v.artist_norm
join public.genres g on g.slug = v.genre_slug;
