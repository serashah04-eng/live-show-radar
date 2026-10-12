-- Step 6: the scheduled discovery job searches a few artists per run, oldest-searched first,
-- so every followed artist is eventually covered within hosting time limits.
alter table public.artists add column if not exists last_searched_at timestamptz;
