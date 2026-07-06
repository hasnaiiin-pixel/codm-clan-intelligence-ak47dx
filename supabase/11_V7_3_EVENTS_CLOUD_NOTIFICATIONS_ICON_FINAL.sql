-- CODM AK47DX V7.3 - Eventi condivisi reali, notifiche cloud, PWA final
-- Eseguire in Supabase SQL Editor. Sicuro da rieseguire più volte.
-- Tabella reale usata dall'app: public.codm_events.

create extension if not exists pgcrypto;

create table if not exists public.codm_events (
  id uuid primary key default gen_random_uuid(),
  clan_id uuid references public.clans(id) on delete cascade,
  title text not null,
  description text,
  starts_at timestamptz not null,
  ends_at timestamptz,
  location text,
  event_type text default 'scrim',
  visibility text default 'public',
  telegram_enabled boolean default true,
  google_calendar_url text,
  reminder_2h_sent_at timestamptz,
  reminder_10m_sent_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
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

create index if not exists idx_codm_events_starts_at on public.codm_events(starts_at);
create index if not exists idx_codm_events_clan_id on public.codm_events(clan_id);
create index if not exists idx_codm_events_local_id on public.codm_events(local_id);
create unique index if not exists codm_events_local_id_unique
  on public.codm_events(local_id)
  where local_id is not null;

create table if not exists public.codm_event_players (
  id uuid primary key default gen_random_uuid(),
  event_id uuid references public.codm_events(id) on delete cascade,
  clan_id uuid references public.clans(id) on delete cascade,
  player_id uuid references public.players(id) on delete set null,
  nickname text not null,
  status text default 'convocato',
  created_at timestamptz default now()
);

create index if not exists idx_codm_event_players_event on public.codm_event_players(event_id);
create index if not exists idx_codm_event_players_clan on public.codm_event_players(clan_id);

create table if not exists public.codm_notification_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  inapp_enabled boolean default true,
  telegram_enabled boolean default true,
  email_enabled boolean default false,
  notification_events boolean default true,
  notification_reminders boolean default true,
  notification_stats boolean default true,
  notification_imports boolean default true,
  notification_admin boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.codm_notifications (
  id uuid primary key default gen_random_uuid(),
  clan_id uuid references public.clans(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  type text not null default 'general',
  title text not null,
  body text,
  metadata jsonb default '{}'::jsonb,
  dedupe_key text,
  read_at timestamptz,
  created_at timestamptz default now()
);

create unique index if not exists codm_notifications_user_dedupe_unique
  on public.codm_notifications(user_id, dedupe_key);
create index if not exists idx_codm_notifications_user_created on public.codm_notifications(user_id, created_at desc);
create index if not exists idx_codm_notifications_clan on public.codm_notifications(clan_id);

create or replace function public.codm_is_clan_writer(target_clan_id uuid)
returns boolean
language sql
stable
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

create or replace function public.codm_is_clan_owner(target_clan_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.clan_members cm
    where cm.clan_id = target_clan_id
      and cm.user_id = auth.uid()
      and cm.role = 'owner'
  );
$$;

alter table public.codm_events enable row level security;
alter table public.codm_event_players enable row level security;
alter table public.codm_notification_preferences enable row level security;
alter table public.codm_notifications enable row level security;

-- Eventi condivisi: lettura pubblica per tutti i player/PWA; scrittura solo staff/coach/owner.
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
create policy codm_events_owner_delete on public.codm_events
  for delete using (public.codm_is_clan_owner(clan_id));

-- Convocati evento: lettura pubblica, modifica staff.
drop policy if exists codm_event_players_public_read on public.codm_event_players;
create policy codm_event_players_public_read on public.codm_event_players
  for select using (true);

drop policy if exists codm_event_players_writer_insert on public.codm_event_players;
create policy codm_event_players_writer_insert on public.codm_event_players
  for insert with check (public.codm_is_clan_writer(clan_id));

drop policy if exists codm_event_players_writer_update on public.codm_event_players;
create policy codm_event_players_writer_update on public.codm_event_players
  for update using (public.codm_is_clan_writer(clan_id)) with check (public.codm_is_clan_writer(clan_id));

drop policy if exists codm_event_players_writer_delete on public.codm_event_players;
create policy codm_event_players_writer_delete on public.codm_event_players
  for delete using (public.codm_is_clan_writer(clan_id));

-- Preferenze notifiche: ogni utente gestisce le sue.
drop policy if exists codm_notification_preferences_self_select on public.codm_notification_preferences;
create policy codm_notification_preferences_self_select on public.codm_notification_preferences
  for select using (auth.uid() = user_id);

drop policy if exists codm_notification_preferences_self_insert on public.codm_notification_preferences;
create policy codm_notification_preferences_self_insert on public.codm_notification_preferences
  for insert with check (auth.uid() = user_id);

drop policy if exists codm_notification_preferences_self_update on public.codm_notification_preferences;
create policy codm_notification_preferences_self_update on public.codm_notification_preferences
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Notifiche: l'utente vede/segna le proprie. Inserimento self abilitato per fallback locale; route server con service role crea quelle per tutti.
drop policy if exists codm_notifications_self_select on public.codm_notifications;
create policy codm_notifications_self_select on public.codm_notifications
  for select using (auth.uid() = user_id);

drop policy if exists codm_notifications_self_insert on public.codm_notifications;
create policy codm_notifications_self_insert on public.codm_notifications
  for insert with check (auth.uid() = user_id);

drop policy if exists codm_notifications_self_update on public.codm_notifications;
create policy codm_notifications_self_update on public.codm_notifications
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
