-- =========================================================
-- CLAN MANAGER V9.0 COMPLETE FINAL SCHEMA
-- Eseguire su Supabase SQL Editor.
-- Mantiene auth.users; sistema eventi, notifiche, Telegram, template OCR e nuova sezione Torneo.
-- =========================================================

begin;

create extension if not exists pgcrypto;

drop function if exists public.codm_delete_event_hard(uuid) cascade;

create table if not exists public.clans (
  id uuid primary key default gen_random_uuid(),
  name text not null default 'AK47DX',
  tag text not null default 'AK47DX',
  owner_user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.clan_members (
  id uuid primary key default gen_random_uuid(),
  clan_id uuid not null references public.clans(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'player',
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (clan_id, user_id)
);

create table if not exists public.codm_events (
  id uuid primary key default gen_random_uuid(),
  clan_id uuid not null references public.clans(id) on delete cascade,
  title text not null,
  description text,
  starts_at timestamptz default now(),
  ends_at timestamptz,
  location text,
  event_type text default 'scrim',
  type text default 'scrim',
  status text default 'scheduled',
  visibility text default 'public',
  telegram_enabled boolean default true,
  google_calendar_url text,
  event_plan jsonb default '{}'::jsonb,
  result jsonb default '{}'::jsonb,
  convocations jsonb default '[]'::jsonb,
  convocations_text text,
  reminder_minutes integer[] default array[10080,1440,360,120,60,30,10,0],
  telegram_message_template text,
  event_notes text,
  sent_reminders jsonb default '{}'::jsonb,
  reminder_2h_sent_at timestamptz,
  reminder_10m_sent_at timestamptz,
  local_id text,
  sync_status text default 'synced',
  sync_error text,
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.codm_event_players (
  id uuid primary key default gen_random_uuid(),
  event_id uuid references public.codm_events(id) on delete cascade,
  clan_id uuid references public.clans(id) on delete cascade,
  player_id uuid,
  player_name text,
  nickname text,
  role text default 'starter',
  status text default 'convocato',
  position text,
  created_at timestamptz default now()
);

create table if not exists public.codm_notifications (
  id uuid primary key default gen_random_uuid(),
  clan_id uuid references public.clans(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  event_id uuid references public.codm_events(id) on delete cascade,
  type text default 'system',
  title text,
  message text,
  body text,
  metadata jsonb default '{}'::jsonb,
  dedupe_key text,
  read_at timestamptz,
  created_at timestamptz default now()
);

create table if not exists public.codm_ocr_templates (
  id uuid primary key default gen_random_uuid(),
  clan_id uuid references public.clans(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  kind text not null default 'scoreboard_ced',
  phone_key text not null,
  phone_display_name text not null,
  template_key text not null,
  template_display_name text not null,
  coordinate_space text not null default 'content_frame_v1',
  source_image_width integer,
  source_image_height integer,
  content_frame jsonb default '{"x":0,"y":0,"w":1,"h":1}'::jsonb,
  regions jsonb not null default '[]'::jsonb,
  is_default boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (clan_id, kind, phone_key, template_key)
);



-- =========================================================
-- TORNEI CODM SEMPLIFICATI
-- =========================================================
create table if not exists public.codm_tournaments (
  id uuid primary key default gen_random_uuid(),
  clan_id uuid references public.clans(id) on delete cascade,
  name text not null,
  cover_url text,
  description text,
  tournament_date date,
  start_time time,
  lobby_time time,
  max_teams integer default 8,
  format text default '5v5',
  type text default 'A girone',
  status text default 'Bozza',
  rules jsonb default '{}'::jsonb,
  bans jsonb default '{}'::jsonb,
  winner text,
  archived_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.codm_tournament_teams (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid references public.codm_tournaments(id) on delete cascade,
  name text not null,
  captain text,
  players jsonb default '[]'::jsonb,
  reserves jsonb default '[]'::jsonb,
  logo_url text,
  status text default 'Incompleta',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.codm_tournament_players (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid references public.codm_tournaments(id) on delete cascade,
  team_id uuid references public.codm_tournament_teams(id) on delete set null,
  player_id uuid references public.players(id) on delete set null,
  nickname text,
  role text default 'titolare',
  status text default 'In attesa',
  created_at timestamptz default now()
);

create table if not exists public.codm_tournament_registrations (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid references public.codm_tournaments(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  team_id uuid references public.codm_tournament_teams(id) on delete set null,
  nickname text,
  status text default 'In attesa',
  note text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.codm_tournament_rules (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid references public.codm_tournaments(id) on delete cascade,
  rules jsonb default '{}'::jsonb,
  bans jsonb default '{}'::jsonb,
  updated_at timestamptz default now()
);

create table if not exists public.codm_tournament_matches (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid references public.codm_tournaments(id) on delete cascade,
  team_a text,
  team_b text,
  phase text default 'Girone',
  group_name text,
  lobby_time timestamptz,
  match_time timestamptz,
  map_name text,
  mode text,
  status text default 'Da giocare',
  score_a integer,
  score_b integer,
  winner text,
  mvp text,
  screenshot_url text,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.codm_tournament_results (
  id uuid primary key default gen_random_uuid(),
  match_id uuid references public.codm_tournament_matches(id) on delete cascade,
  score_a integer,
  score_b integer,
  winner text,
  mvp text,
  screenshot_url text,
  notes text,
  created_at timestamptz default now()
);

create table if not exists public.codm_tournament_standings (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid references public.codm_tournaments(id) on delete cascade,
  group_name text,
  team_name text,
  played integer default 0,
  wins integer default 0,
  draws integer default 0,
  losses integer default 0,
  points integer default 0,
  round_diff integer default 0,
  status text default 'In attesa',
  updated_at timestamptz default now(),
  unique(tournament_id, group_name, team_name)
);

create table if not exists public.codm_tournament_files (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid references public.codm_tournaments(id) on delete cascade,
  match_id uuid references public.codm_tournament_matches(id) on delete set null,
  file_url text,
  file_type text,
  note text,
  created_at timestamptz default now()
);


alter table public.codm_events alter column id set default gen_random_uuid();

-- Colonne compatibilità se tabelle esistevano già.
alter table public.codm_events add column if not exists reminder_minutes integer[] default array[10080,1440,360,120,60,30,10,0];
alter table public.codm_events add column if not exists sent_reminders jsonb default '{}'::jsonb;
alter table public.codm_events add column if not exists event_plan jsonb default '{}'::jsonb;
alter table public.codm_events add column if not exists convocations jsonb default '[]'::jsonb;
alter table public.codm_events add column if not exists convocations_text text;
alter table public.codm_events add column if not exists telegram_enabled boolean default true;
alter table public.codm_events add column if not exists google_calendar_url text;
alter table public.codm_events add column if not exists event_notes text;
alter table public.codm_events add column if not exists sync_status text default 'synced';
alter table public.codm_events add column if not exists local_id text;
alter table public.codm_notifications add column if not exists body text;
alter table public.codm_notifications add column if not exists metadata jsonb default '{}'::jsonb;
alter table public.codm_notifications add column if not exists dedupe_key text;

-- Clan ufficiale pulito.
do $$
declare
  v_admin uuid;
  v_clan uuid;
begin
  select id into v_admin from auth.users where lower(email)=lower('hasnaiiin@gmail.com') limit 1;
  select id into v_clan from public.clans where upper(coalesce(tag,''))='AK47DX' or upper(coalesce(name,''))='AK47DX' order by created_at asc limit 1;
  if v_clan is null then
    insert into public.clans(name, tag, owner_user_id) values ('AK47DX','AK47DX',v_admin) returning id into v_clan;
  else
    update public.clans set name='AK47DX', tag='AK47DX', owner_user_id=coalesce(owner_user_id,v_admin), updated_at=now() where id=v_clan;
  end if;
  if v_admin is not null then
    insert into public.clan_members(clan_id,user_id,role,status) values (v_clan,v_admin,'owner','active')
    on conflict (clan_id,user_id) do update set role='owner', status='active', updated_at=now();
  end if;
  update public.codm_events set clan_id=v_clan, local_id=null, sync_status='synced', sync_error=null, updated_at=now() where clan_id is null or clan_id<>v_clan or local_id is not null or sync_status is distinct from 'synced';
  update public.codm_tournaments set clan_id=v_clan, updated_at=now() where clan_id is null or clan_id<>v_clan;
end $$;

-- Funzione hard delete coerente con API V8.2.
create or replace function public.codm_delete_event_hard(p_event_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_deleted integer := 0;
begin
  delete from public.codm_event_players where event_id = p_event_id;
  delete from public.codm_notifications where event_id = p_event_id or metadata->>'event_id' = p_event_id::text;
  delete from public.codm_events where id = p_event_id;
  get diagnostics v_deleted = row_count;
  return v_deleted;
end;
$$;

create index if not exists idx_codm_events_clan_starts on public.codm_events(clan_id, starts_at);
create index if not exists idx_codm_events_updated_at on public.codm_events(updated_at desc);
create index if not exists idx_codm_event_players_event_id on public.codm_event_players(event_id);
create index if not exists idx_codm_notifications_event_id on public.codm_notifications(event_id);
create index if not exists idx_codm_notifications_user_dedupe on public.codm_notifications(user_id, dedupe_key);
create index if not exists idx_codm_notifications_clan_created on public.codm_notifications(clan_id, created_at desc);
create index if not exists idx_codm_ocr_templates_lookup on public.codm_ocr_templates(clan_id, kind, phone_key, template_key);
create index if not exists idx_codm_tournaments_clan_status on public.codm_tournaments(clan_id, status);
create index if not exists idx_codm_tournament_teams_tournament on public.codm_tournament_teams(tournament_id);
create index if not exists idx_codm_tournament_matches_tournament on public.codm_tournament_matches(tournament_id, match_time);
create index if not exists idx_codm_tournament_registrations_tournament on public.codm_tournament_registrations(tournament_id, status);

alter table public.clans enable row level security;
alter table public.clan_members enable row level security;
alter table public.codm_events enable row level security;
alter table public.codm_event_players enable row level security;
alter table public.codm_notifications enable row level security;
alter table public.codm_ocr_templates enable row level security;
alter table public.codm_tournaments enable row level security;
alter table public.codm_tournament_teams enable row level security;
alter table public.codm_tournament_players enable row level security;
alter table public.codm_tournament_registrations enable row level security;
alter table public.codm_tournament_rules enable row level security;
alter table public.codm_tournament_matches enable row level security;
alter table public.codm_tournament_results enable row level security;
alter table public.codm_tournament_standings enable row level security;
alter table public.codm_tournament_files enable row level security;

drop policy if exists clans_read_auth on public.clans;
create policy clans_read_auth on public.clans for select to authenticated using (true);
drop policy if exists clan_members_read_auth on public.clan_members;
create policy clan_members_read_auth on public.clan_members for select to authenticated using (true);
drop policy if exists codm_events_public_read on public.codm_events;
create policy codm_events_public_read on public.codm_events for select to authenticated using (true);
drop policy if exists codm_event_players_public_read on public.codm_event_players;
create policy codm_event_players_public_read on public.codm_event_players for select to authenticated using (true);
drop policy if exists codm_notifications_user_read on public.codm_notifications;
create policy codm_notifications_user_read on public.codm_notifications for select to authenticated using (auth.uid() = user_id or user_id is null);
drop policy if exists codm_ocr_templates_read_auth on public.codm_ocr_templates;
create policy codm_ocr_templates_read_auth on public.codm_ocr_templates for select to authenticated using (true);

drop policy if exists codm_tournaments_read_auth on public.codm_tournaments;
create policy codm_tournaments_read_auth on public.codm_tournaments for select to authenticated using (true);
drop policy if exists codm_tournament_teams_read_auth on public.codm_tournament_teams;
create policy codm_tournament_teams_read_auth on public.codm_tournament_teams for select to authenticated using (true);
drop policy if exists codm_tournament_matches_read_auth on public.codm_tournament_matches;
create policy codm_tournament_matches_read_auth on public.codm_tournament_matches for select to authenticated using (true);
drop policy if exists codm_tournament_registrations_read_auth on public.codm_tournament_registrations;
create policy codm_tournament_registrations_read_auth on public.codm_tournament_registrations for select to authenticated using (true);
drop policy if exists codm_tournament_results_read_auth on public.codm_tournament_results;
create policy codm_tournament_results_read_auth on public.codm_tournament_results for select to authenticated using (true);
drop policy if exists codm_tournament_standings_read_auth on public.codm_tournament_standings;
create policy codm_tournament_standings_read_auth on public.codm_tournament_standings for select to authenticated using (true);
drop policy if exists codm_tournament_files_read_auth on public.codm_tournament_files;
create policy codm_tournament_files_read_auth on public.codm_tournament_files for select to authenticated using (true);

-- Prima release torneo: scritture semplici agli autenticati; in app i pulsanti restano riservati a Staff/Coach/Owner.
drop policy if exists codm_tournaments_write_auth on public.codm_tournaments;
create policy codm_tournaments_write_auth on public.codm_tournaments for all to authenticated using (true) with check (true);
drop policy if exists codm_tournament_teams_write_auth on public.codm_tournament_teams;
create policy codm_tournament_teams_write_auth on public.codm_tournament_teams for all to authenticated using (true) with check (true);
drop policy if exists codm_tournament_matches_write_auth on public.codm_tournament_matches;
create policy codm_tournament_matches_write_auth on public.codm_tournament_matches for all to authenticated using (true) with check (true);
drop policy if exists codm_tournament_registrations_write_auth on public.codm_tournament_registrations;
create policy codm_tournament_registrations_write_auth on public.codm_tournament_registrations for all to authenticated using (true) with check (true);

commit;
