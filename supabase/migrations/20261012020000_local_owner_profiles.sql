-- Local owner mode: user-owned tables reference public.profiles(id) instead of auth.users(id),
-- so a local-only owner profile can exist without a sign-up. Real signed-up users still get a
-- profile through the existing trigger, and deleting an auth user deletes their profile (cascade).
-- No data is deleted: the tables had no user rows when this ran.

alter table public.profiles drop constraint if exists profiles_id_fkey;

do $$
declare r record;
begin
  for r in
    select c.conrelid::regclass as tbl, c.conname, a.attname as col,
           case c.confdeltype when 'c' then 'cascade' when 'n' then 'set null' else 'no action' end as del
    from pg_constraint c
    join pg_attribute a on a.attrelid = c.conrelid and a.attnum = c.conkey[1]
    where c.contype = 'f'
      and c.confrelid = 'auth.users'::regclass
      and c.connamespace = 'public'::regnamespace
  loop
    execute format('alter table %s drop constraint %I', r.tbl, r.conname);
    execute format('alter table %s add constraint %I foreign key (%I) references public.profiles(id) on delete %s',
                   r.tbl, r.conname, r.col, r.del);
  end loop;
end $$;

create or replace function public.handle_user_deleted() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  delete from public.profiles where id = old.id;
  return old;
end $$;

drop trigger if exists on_auth_user_deleted on auth.users;
create trigger on_auth_user_deleted after delete on auth.users
  for each row execute function public.handle_user_deleted();

-- Local-only owner identity (a profile row, NOT a login: it has no auth account or password).
insert into public.profiles (id, display_name, is_admin)
values ('00000000-0000-4000-8000-000000000001', 'Local owner', true)
on conflict (id) do nothing;
