-- CODM AK47DX V7.6 - DATABASE ONLY EVENTS FINAL
-- Obiettivo: una sola sorgente dati per gli eventi: public.codm_events su Supabase.
-- Nessuna coda locale, nessun evento pending PWA, nessun merge con localStorage.

create extension if not exists pgcrypto;

create table if not exists public.codm_events (
  id uuid primary key default gen_random_uuid(),
  clan_id uuid references public.clans(id) on delete cascade,
  title text not null default 'Evento CODM',
  description text,
  starts_at timestamptz not null default now(),
  ends_at timestamptz,
  location text,
  event_type text default 'scrim',
  visibility text default 'public',
  telegram_enabled boolean default true,
  google_calendar_url text,
  created_at timestamptz default now()
);

alter table public.codm_events add column if not exists event_plan jsonb default '{}'::jsonb;
alter table public.codm_events add column if not exists convocations jsonb default '[]'::jsonb;
alter table public.codm_events add column if not exists convocations_text text;
alter table public.codm_events add column if not exists reminder_minutes integer[] default array[120,60,30,10];
alter table public.codm_events add column if not exists telegram_message_template text;
alter table public.codm_events add column if not exists event_notes text;
alter table public.codm_events add column if not exists local_id text;
alter table public.codm_events add column if not exists sync_status text default 'synced';
alter table public.codm_events add column if not exists sync_error text;
alter table public.codm_events add column if not exists created_by uuid references auth.users(id) on delete set null;
alter table public.codm_events add column if not exists updated_at timestamptz default now();
alter table public.codm_events alter column id set default gen_random_uuid();

-- Reset metadata vecchie PWA: gli eventi rimangono, ma non esiste più stato locale/pending.
update public.codm_events
set local_id = null,
    sync_status = 'synced',
    sync_error = null,
    updated_at = coalesce(updated_at, now())
where local_id is not null
   or sync_status is distinct from 'synced'
   or sync_error is not null;

create index if not exists idx_codm_events_starts_at on public.codm_events(starts_at);
create index if not exists idx_codm_events_clan_id on public.codm_events(clan_id);

create table if not exists public.codm_event_players (
  id uuid primary key default gen_random_uuid(),
  event_id uuid references public.codm_events(id) on delete cascade,
  clan_id uuid references public.clans(id) on delete cascade,
  player_id uuid references public.players(id) on delete set null,
  nickname text not null,
  status text default 'convocato',
  created_at timestamptz default now()
);

create index if not exists idx_codm_event_players_event_id on public.codm_event_players(event_id);
create index if not exists idx_codm_event_players_clan_id on public.codm_event_players(clan_id);

create table if not exists public.codm_notifications (
  id uuid primary key default gen_random_uuid(),
  clan_id uuid references public.clans(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  type text default 'system',
  title text not null,
  body text,
  metadata jsonb default '{}'::jsonb,
  dedupe_key text,
  read_at timestamptz,
  created_at timestamptz default now()
);

create index if not exists idx_codm_notifications_user_created on public.codm_notifications(user_id, created_at desc);
create index if not exists idx_codm_notifications_clan_created on public.codm_notifications(clan_id, created_at desc);
create index if not exists idx_codm_notifications_metadata on public.codm_notifications using gin(metadata);
create unique index if not exists codm_notifications_user_dedupe_unique
  on public.codm_notifications(user_id, dedupe_key)
  where dedupe_key is not null;

create or replace function public.codm_is_clan_writer(target_clan_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.clan_members cm
    where cm.clan_id = target_clan_id
      and cm.user_id = auth.uid()
      and cm.role in ('owner','coach','staff')
  );
$$;

create or replace function public.codm_is_clan_member(target_clan_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.clan_members cm
    where cm.clan_id = target_clan_id
      and cm.user_id = auth.uid()
  );
$$;

alter table public.codm_events enable row level security;
alter table public.codm_event_players enable row level security;
alter table public.codm_notifications enable row level security;

drop policy if exists codm_events_public_read on public.codm_events;
create policy codm_events_public_read on public.codm_events
  for select using (true);

drop policy if exists codm_events_writer_insert on public.codm_events;
create policy codm_events_writer_insert on public.codm_events
  for insert with check (public.codm_is_clan_writer(clan_id));

drop policy if exists codm_events_writer_update on public.codm_events;
create policy codm_events_writer_update on public.codm_events
  for update using (public.codm_is_clan_writer(clan_id)) with check (public.codm_is_clan_writer(clan_id));

drop policy if exists codm_events_owner_delete on public.codm_events;
drop policy if exists codm_events_writer_delete on public.codm_events;
create policy codm_events_writer_delete on public.codm_events
  for delete using (public.codm_is_clan_writer(clan_id));

drop policy if exists codm_event_players_public_read on public.codm_event_players;
create policy codm_event_players_public_read on public.codm_event_players
  for select using (true);

drop policy if exists codm_event_players_writer_all on public.codm_event_players;
create policy codm_event_players_writer_all on public.codm_event_players
  for all using (public.codm_is_clan_writer(clan_id)) with check (public.codm_is_clan_writer(clan_id));

drop policy if exists codm_notifications_user_read on public.codm_notifications;
create policy codm_notifications_user_read on public.codm_notifications
  for select using (auth.uid() = user_id);

drop policy if exists codm_notifications_user_update on public.codm_notifications;
create policy codm_notifications_user_update on public.codm_notifications
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists codm_notifications_writer_insert on public.codm_notifications;
create policy codm_notifications_writer_insert on public.codm_notifications
  for insert with check (public.codm_is_clan_writer(clan_id) or auth.uid() = user_id);

drop policy if exists codm_notifications_writer_delete on public.codm_notifications;
create policy codm_notifications_writer_delete on public.codm_notifications
  for delete using (public.codm_is_clan_writer(clan_id) or auth.uid() = user_id);
