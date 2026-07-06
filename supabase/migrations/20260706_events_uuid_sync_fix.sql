-- CODM PWA FULL STABLE - Fix UUID + sync locale/PWA
-- Eseguire nel SQL Editor di Supabase.

create extension if not exists pgcrypto;

-- La tabella si chiama probabilmente events. Se nel tuo progetto ha un nome diverso,
-- cambia public.events con il nome corretto.

alter table if exists public.events
  alter column id set default gen_random_uuid();

alter table if exists public.events
  add column if not exists local_id text,
  add column if not exists device_id text,
  add column if not exists sync_status text default 'synced',
  add column if not exists sync_error text,
  add column if not exists updated_at timestamptz default now();

-- Serve per upsert/retry dalla PWA. Permette 1 evento locale per device.
create unique index if not exists events_local_id_unique
  on public.events(local_id)
  where local_id is not null;

-- Valori sync ammessi.
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'events_sync_status_check'
  ) then
    alter table public.events
      add constraint events_sync_status_check
      check (sync_status in ('pending', 'synced', 'error', 'deleted'));
  end if;
end $$;

-- Trigger aggiornamento updated_at, se non esiste già.
create or replace function public.codm_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists codm_events_set_updated_at on public.events;
create trigger codm_events_set_updated_at
before update on public.events
for each row
execute function public.codm_set_updated_at();
