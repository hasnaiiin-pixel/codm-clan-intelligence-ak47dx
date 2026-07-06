-- CODM AK47DX V7.1 - PWA Eventi + Statistiche + UUID fix
-- Sicuro da eseguire più volte in Supabase SQL Editor.

create extension if not exists pgcrypto;

alter table public.codm_events add column if not exists event_plan jsonb default '{}'::jsonb;
alter table public.codm_events add column if not exists convocations jsonb default '[]'::jsonb;
alter table public.codm_events add column if not exists convocations_text text;
alter table public.codm_events add column if not exists reminder_minutes integer[] default array[120,60,30,10];
alter table public.codm_events add column if not exists telegram_message_template text;
alter table public.codm_events add column if not exists event_notes text;
alter table public.codm_events add column if not exists local_id text;
alter table public.codm_events add column if not exists sync_status text default 'synced';
alter table public.codm_events add column if not exists sync_error text;
alter table public.codm_events alter column id set default gen_random_uuid();

create unique index if not exists codm_events_local_id_unique
  on public.codm_events(local_id)
  where local_id is not null;
create index if not exists idx_codm_events_starts_at on public.codm_events(starts_at);
create index if not exists idx_codm_events_clan_id on public.codm_events(clan_id);

create table if not exists public.codm_event_players (
  id uuid primary key default gen_random_uuid(),
  event_id uuid references public.codm_events(id) on delete cascade,
  clan_id uuid references public.clans(id) on delete cascade,
  player_id uuid references public.players(id) on delete set null,
  nickname text not null,
  status text default 'convocato',
  created_at timestamptz default now(),
  unique(event_id, player_id)
);

alter table public.codm_event_players enable row level security;

drop policy if exists codm_event_players_public_read on public.codm_event_players;
create policy codm_event_players_public_read on public.codm_event_players
  for select using (true);

drop policy if exists codm_event_players_writer_insert on public.codm_event_players;
create policy codm_event_players_writer_insert on public.codm_event_players
  for insert with check (public.codm_is_clan_writer(clan_id));

drop policy if exists codm_event_players_writer_update on public.codm_event_players;
create policy codm_event_players_writer_update on public.codm_event_players
  for update using (public.codm_is_clan_writer(clan_id));

drop policy if exists codm_event_players_owner_delete on public.codm_event_players;
create policy codm_event_players_owner_delete on public.codm_event_players
  for delete using (public.codm_is_clan_writer(clan_id));

-- Politiche evento coerenti con l'app reale: tabella public.codm_events, non public.events.
alter table public.codm_events enable row level security;

drop policy if exists codm_events_public_read on public.codm_events;
create policy codm_events_public_read on public.codm_events
  for select using (true);

drop policy if exists codm_events_writer_insert on public.codm_events;
create policy codm_events_writer_insert on public.codm_events
  for insert with check (public.codm_is_clan_writer(clan_id));

drop policy if exists codm_events_writer_update on public.codm_events;
create policy codm_events_writer_update on public.codm_events
  for update using (public.codm_is_clan_writer(clan_id));

drop policy if exists codm_events_owner_delete on public.codm_events;
create policy codm_events_owner_delete on public.codm_events
  for delete using (public.codm_is_clan_owner(clan_id));
