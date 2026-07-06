-- CODM PWA FULL STABLE CLEAN V4
-- Crea tabella eventi se manca e impedisce l'errore UUID con id locali tipo local-ak47dx.
-- Da eseguire nel SQL Editor di Supabase.

create extension if not exists pgcrypto;

create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  local_id text,
  device_id text,
  title text not null default 'Evento CODM',
  event_type text default 'event',
  status text default 'scheduled',
  event_date timestamptz,
  start_at timestamptz,
  lobby_open_at timestamptz,
  description text,
  cover_url text,
  payload jsonb not null default '{}'::jsonb,
  local_uuid_refs jsonb not null default '{}'::jsonb,
  sync_status text not null default 'synced',
  sync_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.events
  alter column id set default gen_random_uuid();

alter table public.events
  add column if not exists local_id text,
  add column if not exists device_id text,
  add column if not exists title text default 'Evento CODM',
  add column if not exists event_type text default 'event',
  add column if not exists status text default 'scheduled',
  add column if not exists event_date timestamptz,
  add column if not exists start_at timestamptz,
  add column if not exists lobby_open_at timestamptz,
  add column if not exists description text,
  add column if not exists cover_url text,
  add column if not exists payload jsonb not null default '{}'::jsonb,
  add column if not exists local_uuid_refs jsonb not null default '{}'::jsonb,
  add column if not exists sync_status text not null default 'synced',
  add column if not exists sync_error text,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

create unique index if not exists events_local_id_unique
  on public.events(local_id)
  where local_id is not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'events_sync_status_check'
      and conrelid = 'public.events'::regclass
  ) then
    alter table public.events
      add constraint events_sync_status_check
      check (sync_status in ('pending', 'synced', 'error', 'deleted'));
  end if;
end $$;

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

select 'public.events pronta per CODM PWA FULL STABLE CLEAN V4' as risultato;
