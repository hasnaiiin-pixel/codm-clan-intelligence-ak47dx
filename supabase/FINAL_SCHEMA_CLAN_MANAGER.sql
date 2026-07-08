-- =========================================================
-- CLAN MANAGER V11.0 COMPLETE FINAL SCHEMA
-- Eseguire su Supabase SQL Editor.
-- Mantiene auth.users; sistema eventi, roster, import risultati, OCR e Torneo Pro.
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

-- ROSTER / MATCH CORE usato da import risultati, statistiche e profili.
create table if not exists public.players (
  id uuid primary key default gen_random_uuid(),
  clan_id uuid references public.clans(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  nickname text not null,
  uid_codm text,
  clan_name text default 'AK47DX',
  status text default 'active',
  role text default 'player',
  profile_stats jsonb default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.matches (
  id uuid primary key default gen_random_uuid(),
  clan_id uuid references public.clans(id) on delete cascade,
  match_date timestamptz default now(),
  match_type text default 'scrim',
  mode text default 'CED',
  map_name text,
  opponent text,
  result text default 'WIN',
  team_score integer,
  enemy_score integer,
  screenshot_url text,
  screenshot_storage_path text,
  winning_team text,
  our_team text,
  match_notes text,
  notes text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.match_player_stats (
  id uuid primary key default gen_random_uuid(),
  match_id uuid references public.matches(id) on delete cascade,
  player_id uuid references public.players(id) on delete set null,
  kills integer default 0,
  deaths integer default 0,
  assists integer default 0,
  score integer default 0,
  rating numeric,
  mvp boolean default false,
  team_side text default 'ALLY',
  created_at timestamptz default now()
);

create table if not exists public.match_scoreboard_rows (
  id uuid primary key default gen_random_uuid(),
  match_id uuid references public.matches(id) on delete cascade,
  player_id uuid references public.players(id) on delete set null,
  team_side text,
  team_rank integer,
  nickname_raw text,
  nickname_resolved text,
  kills integer default 0,
  deaths integer default 0,
  assists integer default 0,
  score integer default 0,
  impact numeric,
  captures integer default 0,
  objective_time_seconds integer default 0,
  objective_time_text text,
  mvp_type text,
  read_status text default 'manual',
  created_at timestamptz default now()
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
  phone_key text not null default 'default',
  phone_display_name text not null default 'default',
  template_key text not null default 'default',
  template_display_name text not null default 'default',
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
-- TORNEO PRO V11.0
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
  format text default 'Da decidere dopo iscrizioni',
  type text default 'Da decidere dopo iscrizioni',
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
  bracket_order integer default 0,
  next_match_id uuid,
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

create table if not exists public.codm_reference_data (
  id uuid primary key default gen_random_uuid(),
  category text not null,
  code text not null,
  label text not null,
  sort_order integer default 0,
  active boolean default true,
  metadata jsonb default '{}'::jsonb,
  unique(category, code)
);

-- Colonne compatibilità se tabelle esistevano già.
alter table public.players add column if not exists clan_id uuid references public.clans(id) on delete cascade;
alter table public.players add column if not exists user_id uuid references auth.users(id) on delete set null;
alter table public.players add column if not exists uid_codm text;
alter table public.players add column if not exists clan_name text default 'AK47DX';
alter table public.players add column if not exists status text default 'active';
alter table public.players add column if not exists role text default 'player';
alter table public.players add column if not exists profile_stats jsonb default '{}'::jsonb;
alter table public.players add column if not exists updated_at timestamptz default now();
alter table public.matches add column if not exists team_score integer;
alter table public.matches add column if not exists enemy_score integer;
alter table public.matches add column if not exists winning_team text;
alter table public.matches add column if not exists our_team text;
alter table public.matches add column if not exists match_notes text;
alter table public.matches add column if not exists notes text;
alter table public.codm_events alter column id set default gen_random_uuid();
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
alter table public.codm_tournament_matches add column if not exists screenshot_url text;
alter table public.codm_tournament_matches add column if not exists bracket_order integer default 0;
alter table public.codm_tournament_matches add column if not exists next_match_id uuid;

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
  update public.players set clan_id=coalesce(clan_id,v_clan), clan_name=coalesce(clan_name,'AK47DX'), updated_at=now() where clan_id is null;
end $$;

-- Funzione hard delete coerente con API eventi.
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

-- Reference data CODM per menu mappe/modalità/tipo partita.
insert into public.codm_reference_data(category, code, label, sort_order) values
('mode','CED','Cerca e Distruggi',1),('mode','POSTAZIONE','Postazione',2),('mode','DOMINIO','Dominio',3),('mode','CONTROL','Control',4),('mode','TDM','Team Deathmatch',5),('mode','KILL_CONFIRMED','Kill Confirmed',6),
('match_type','scrim','Scrim',1),('match_type','tournament','Torneo',2),('match_type','private','Private',3),('match_type','ranked','Ranked',4),('match_type','training','Allenamento',5),
('map','Standoff','Standoff',1),('map','Raid','Raid',2),('map','Firing Range','Firing Range',3),('map','Summit','Summit',4),('map','Slums','Slums',5),('map','Hacienda','Hacienda',6),('map','Takeoff','Takeoff',7),('map','Meltdown','Meltdown',8),('map','Crash','Crash',9),('map','Crossfire','Crossfire',10),('map','Nuketown','Nuketown',11),('map','Hijacked','Hijacked',12),('map','Shoot House','Shoot House',13),('map','Shipment','Shipment',14),('map','Rust','Rust',15),('map','Terminal','Terminal',16),('map','Highrise','Highrise',17),('map','Tunisia','Tunisia',18),('map','Coastal','Coastal',19),('map','Express','Express',20),('map','Dome','Dome',21)
on conflict(category, code) do update set label=excluded.label, sort_order=excluded.sort_order, active=true;

create index if not exists idx_players_clan_nickname on public.players(clan_id, nickname);
create index if not exists idx_matches_clan_date on public.matches(clan_id, match_date desc);
create index if not exists idx_match_player_stats_match on public.match_player_stats(match_id);
create index if not exists idx_match_scoreboard_rows_match on public.match_scoreboard_rows(match_id);
create index if not exists idx_codm_events_clan_starts on public.codm_events(clan_id, starts_at);
create index if not exists idx_codm_notifications_user_dedupe on public.codm_notifications(user_id, dedupe_key);
create index if not exists idx_codm_ocr_templates_lookup on public.codm_ocr_templates(clan_id, kind, phone_key, template_key);
create index if not exists idx_codm_tournaments_clan_status on public.codm_tournaments(clan_id, status);
create index if not exists idx_codm_tournament_teams_tournament on public.codm_tournament_teams(tournament_id);
create index if not exists idx_codm_tournament_matches_tournament on public.codm_tournament_matches(tournament_id, match_time);
create index if not exists idx_codm_tournament_registrations_tournament on public.codm_tournament_registrations(tournament_id, status);
create unique index if not exists ux_codm_tournament_reg_user on public.codm_tournament_registrations(tournament_id, user_id) where user_id is not null;

alter table public.clans enable row level security;
alter table public.clan_members enable row level security;
alter table public.players enable row level security;
alter table public.matches enable row level security;
alter table public.match_player_stats enable row level security;
alter table public.match_scoreboard_rows enable row level security;
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
alter table public.codm_reference_data enable row level security;

-- Policy semplici: lettura autenticati, scrittura gestita dall'app/ruoli UI.
do $$
declare r record;
begin
  for r in select unnest(array['clans','clan_members','players','matches','match_player_stats','match_scoreboard_rows','codm_events','codm_event_players','codm_notifications','codm_ocr_templates','codm_tournaments','codm_tournament_teams','codm_tournament_players','codm_tournament_registrations','codm_tournament_rules','codm_tournament_matches','codm_tournament_results','codm_tournament_standings','codm_tournament_files','codm_reference_data']) as table_name loop
    execute format('drop policy if exists %I on public.%I', r.table_name || '_read_auth', r.table_name);
    execute format('create policy %I on public.%I for select to authenticated using (true)', r.table_name || '_read_auth', r.table_name);
    execute format('drop policy if exists %I on public.%I', r.table_name || '_write_auth', r.table_name);
    execute format('create policy %I on public.%I for all to authenticated using (true) with check (true)', r.table_name || '_write_auth', r.table_name);
  end loop;
end $$;

commit;
-- CLAN MANAGER V12.1
-- Supporto import Excel + foto prova allegabile anche dopo + collegamento player a profilo reale.
-- Eseguire dopo FINAL_SCHEMA_CLAN_MANAGER.sql se il database è già esistente.

alter table if exists public.matches
  add column if not exists screenshot_url text,
  add column if not exists screenshot_storage_path text,
  add column if not exists match_notes text,
  add column if not exists notes text;

alter table if exists public.players
  add column if not exists user_id uuid references auth.users(id) on delete set null,
  add column if not exists uid_codm text,
  add column if not exists clan_name text,
  add column if not exists notes text;

create index if not exists idx_players_user_id on public.players(user_id);
create index if not exists idx_players_uid_codm on public.players(uid_codm);
create index if not exists idx_matches_screenshot on public.matches(screenshot_storage_path);

-- Bucket screenshot: se non esiste, crealo da Supabase Storage UI con nome codm-screenshots.
-- Questo script non modifica Auth e non cancella dati.
