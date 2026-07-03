-- CODM Clan Intelligence Cloud - Supabase schema MVP 0.1
-- Esegui questo file in Supabase SQL Editor.

create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  created_at timestamptz not null default now()
);

create table if not exists public.clans (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  tag text,
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.clan_members (
  id uuid primary key default gen_random_uuid(),
  clan_id uuid not null references public.clans(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'player' check (role in ('owner','coach','staff','player','viewer')),
  created_at timestamptz not null default now(),
  unique (clan_id, user_id)
);

create table if not exists public.players (
  id uuid primary key default gen_random_uuid(),
  clan_id uuid not null references public.clans(id) on delete cascade,
  nickname text not null,
  uid_codm text,
  avatar_url text,
  clan_name text,
  account_level int,
  rank_mp_current text,
  rank_br_current text,
  rank_mp_best text,
  rank_br_best text,
  main_role text,
  secondary_role text,
  status text not null default 'active' check (status in ('active','bench','tryout','inactive')),
  notes text,
  created_at timestamptz not null default now(),
  unique (clan_id, nickname)
);

create table if not exists public.player_snapshots (
  id uuid primary key default gen_random_uuid(),
  clan_id uuid not null references public.clans(id) on delete cascade,
  player_id uuid not null references public.players(id) on delete cascade,
  imported_at timestamptz not null default now(),
  screenshot_url text,
  source_type text not null default 'profile_screenshot',
  mvp_count int,
  games_count int,
  top3_count int,
  total_kills int,
  kd numeric(8,2),
  avg_accuracy numeric(8,2),
  ocr_raw_text text,
  confidence_score numeric(5,2)
);

create table if not exists public.matches (
  id uuid primary key default gen_random_uuid(),
  clan_id uuid not null references public.clans(id) on delete cascade,
  match_date timestamptz not null default now(),
  match_type text not null default 'scrim' check (match_type in ('scrim','ranked','private','training','tournament','br')),
  mode text not null check (mode in ('CED','TDM','PRIMA_LINEA','DOMINIO','POSTAZIONE','KILL_CONFIRMED','BR_SOLO','BR_DUO','BR_SQUAD')),
  map_name text,
  opponent text,
  result text not null check (result in ('WIN','LOSE','DRAW')),
  team_score int,
  enemy_score int,
  screenshot_url text,
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.match_player_stats (
  id uuid primary key default gen_random_uuid(),
  clan_id uuid not null references public.clans(id) on delete cascade,
  match_id uuid not null references public.matches(id) on delete cascade,
  player_id uuid not null references public.players(id) on delete cascade,
  kills int not null default 0,
  deaths int not null default 0,
  assists int not null default 0,
  score int not null default 0,
  objective_score int not null default 0,
  captures int not null default 0,
  defends int not null default 0,
  is_mvp boolean not null default false,
  rating numeric(6,2) not null default 0,
  created_at timestamptz not null default now(),
  unique (match_id, player_id)
);

create table if not exists public.loadouts (
  id uuid primary key default gen_random_uuid(),
  clan_id uuid not null references public.clans(id) on delete cascade,
  player_id uuid references public.players(id) on delete set null,
  name text not null,
  weapon text not null,
  attachments jsonb not null default '[]'::jsonb,
  perks jsonb not null default '[]'::jsonb,
  lethal text,
  tactical text,
  operator_skill text,
  mode text,
  map_name text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.match_loadouts (
  id uuid primary key default gen_random_uuid(),
  clan_id uuid not null references public.clans(id) on delete cascade,
  match_id uuid not null references public.matches(id) on delete cascade,
  player_id uuid not null references public.players(id) on delete cascade,
  loadout_id uuid references public.loadouts(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.screenshot_imports (
  id uuid primary key default gen_random_uuid(),
  clan_id uuid not null references public.clans(id) on delete cascade,
  uploaded_by uuid references auth.users(id) on delete set null,
  import_type text not null check (import_type in ('profile','scoreboard','loadout','chat')),
  file_url text,
  ocr_raw_text text,
  parser_status text not null default 'pending' check (parser_status in ('pending','confirmed','rejected','needs_review')),
  created_at timestamptz not null default now()
);

create index if not exists idx_clan_members_user on public.clan_members(user_id);
create index if not exists idx_players_clan on public.players(clan_id);
create index if not exists idx_matches_clan_date on public.matches(clan_id, match_date desc);
create index if not exists idx_match_stats_player on public.match_player_stats(player_id);

-- Funzioni helper per evitare policy ricorsive.
create or replace function public.is_clan_member(p_clan_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.clan_members cm
    where cm.clan_id = p_clan_id and cm.user_id = auth.uid()
  );
$$;

create or replace function public.is_clan_admin(p_clan_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.clan_members cm
    where cm.clan_id = p_clan_id and cm.user_id = auth.uid() and cm.role in ('owner','coach','staff')
  );
$$;

create or replace function public.add_owner_membership()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.clan_members (clan_id, user_id, role)
  values (new.id, new.owner_user_id, 'owner')
  on conflict (clan_id, user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists trg_add_owner_membership on public.clans;
create trigger trg_add_owner_membership
after insert on public.clans
for each row execute function public.add_owner_membership();

alter table public.profiles enable row level security;
alter table public.clans enable row level security;
alter table public.clan_members enable row level security;
alter table public.players enable row level security;
alter table public.player_snapshots enable row level security;
alter table public.matches enable row level security;
alter table public.match_player_stats enable row level security;
alter table public.loadouts enable row level security;
alter table public.match_loadouts enable row level security;
alter table public.screenshot_imports enable row level security;

-- Profiles
create policy "profiles select own" on public.profiles for select using (id = auth.uid());
create policy "profiles insert own" on public.profiles for insert with check (id = auth.uid());
create policy "profiles update own" on public.profiles for update using (id = auth.uid()) with check (id = auth.uid());

-- Clans
create policy "clans insert authenticated owner" on public.clans for insert to authenticated with check (owner_user_id = auth.uid());
create policy "clans select members" on public.clans for select to authenticated using (public.is_clan_member(id));
create policy "clans update admins" on public.clans for update to authenticated using (public.is_clan_admin(id)) with check (public.is_clan_admin(id));

-- Clan members
create policy "clan members select members" on public.clan_members for select to authenticated using (public.is_clan_member(clan_id));
create policy "clan members insert admins" on public.clan_members for insert to authenticated with check (public.is_clan_admin(clan_id));
create policy "clan members update admins" on public.clan_members for update to authenticated using (public.is_clan_admin(clan_id)) with check (public.is_clan_admin(clan_id));
create policy "clan members delete admins" on public.clan_members for delete to authenticated using (public.is_clan_admin(clan_id));

-- Clan scoped tables: members read, admins write.
create policy "players select members" on public.players for select to authenticated using (public.is_clan_member(clan_id));
create policy "players insert admins" on public.players for insert to authenticated with check (public.is_clan_admin(clan_id));
create policy "players update admins" on public.players for update to authenticated using (public.is_clan_admin(clan_id)) with check (public.is_clan_admin(clan_id));
create policy "players delete admins" on public.players for delete to authenticated using (public.is_clan_admin(clan_id));

create policy "matches select members" on public.matches for select to authenticated using (public.is_clan_member(clan_id));
create policy "matches insert admins" on public.matches for insert to authenticated with check (public.is_clan_admin(clan_id));
create policy "matches update admins" on public.matches for update to authenticated using (public.is_clan_admin(clan_id)) with check (public.is_clan_admin(clan_id));
create policy "matches delete admins" on public.matches for delete to authenticated using (public.is_clan_admin(clan_id));

create policy "stats select members" on public.match_player_stats for select to authenticated using (public.is_clan_member(clan_id));
create policy "stats insert admins" on public.match_player_stats for insert to authenticated with check (public.is_clan_admin(clan_id));
create policy "stats update admins" on public.match_player_stats for update to authenticated using (public.is_clan_admin(clan_id)) with check (public.is_clan_admin(clan_id));
create policy "stats delete admins" on public.match_player_stats for delete to authenticated using (public.is_clan_admin(clan_id));

create policy "snapshots select members" on public.player_snapshots for select to authenticated using (public.is_clan_member(clan_id));
create policy "snapshots insert admins" on public.player_snapshots for insert to authenticated with check (public.is_clan_admin(clan_id));
create policy "snapshots update admins" on public.player_snapshots for update to authenticated using (public.is_clan_admin(clan_id)) with check (public.is_clan_admin(clan_id));
create policy "snapshots delete admins" on public.player_snapshots for delete to authenticated using (public.is_clan_admin(clan_id));

create policy "loadouts select members" on public.loadouts for select to authenticated using (public.is_clan_member(clan_id));
create policy "loadouts insert admins" on public.loadouts for insert to authenticated with check (public.is_clan_admin(clan_id));
create policy "loadouts update admins" on public.loadouts for update to authenticated using (public.is_clan_admin(clan_id)) with check (public.is_clan_admin(clan_id));
create policy "loadouts delete admins" on public.loadouts for delete to authenticated using (public.is_clan_admin(clan_id));

create policy "match loadouts select members" on public.match_loadouts for select to authenticated using (public.is_clan_member(clan_id));
create policy "match loadouts insert admins" on public.match_loadouts for insert to authenticated with check (public.is_clan_admin(clan_id));
create policy "match loadouts update admins" on public.match_loadouts for update to authenticated using (public.is_clan_admin(clan_id)) with check (public.is_clan_admin(clan_id));
create policy "match loadouts delete admins" on public.match_loadouts for delete to authenticated using (public.is_clan_admin(clan_id));

create policy "imports select members" on public.screenshot_imports for select to authenticated using (public.is_clan_member(clan_id));
create policy "imports insert admins" on public.screenshot_imports for insert to authenticated with check (public.is_clan_admin(clan_id));
create policy "imports update admins" on public.screenshot_imports for update to authenticated using (public.is_clan_admin(clan_id)) with check (public.is_clan_admin(clan_id));
create policy "imports delete admins" on public.screenshot_imports for delete to authenticated using (public.is_clan_admin(clan_id));

-- Storage bucket pubblico per MVP: semplice da testare.
-- In produzione puoi renderlo privato e usare signed URLs.
insert into storage.buckets (id, name, public)
values ('codm-screenshots', 'codm-screenshots', true)
on conflict (id) do nothing;

-- Policy storage: il primo folder deve essere clan_id.
-- Esempio path: <clan_id>/profiles/file.png oppure <clan_id>/matches/file.png
create policy "storage read clan screenshots" on storage.objects
for select to authenticated
using (
  bucket_id = 'codm-screenshots'
  and public.is_clan_member(((storage.foldername(name))[1])::uuid)
);

create policy "storage upload clan screenshots" on storage.objects
for insert to authenticated
with check (
  bucket_id = 'codm-screenshots'
  and public.is_clan_admin(((storage.foldername(name))[1])::uuid)
);

create policy "storage update clan screenshots" on storage.objects
for update to authenticated
using (
  bucket_id = 'codm-screenshots'
  and public.is_clan_admin(((storage.foldername(name))[1])::uuid)
);

create policy "storage delete clan screenshots" on storage.objects
for delete to authenticated
using (
  bucket_id = 'codm-screenshots'
  and public.is_clan_admin(((storage.foldername(name))[1])::uuid)
);


-- CODM Clan Intelligence Cloud - Migration 0.2
-- Da eseguire UNA VOLTA in Supabase SQL Editor dopo la MVP 0.1.

alter table public.player_snapshots add column if not exists wins_count int;
alter table public.player_snapshots add column if not exists avg_damage numeric(10,2);
alter table public.player_snapshots add column if not exists extraction_rate numeric(8,2);
alter table public.player_snapshots add column if not exists profit_loss_ratio numeric(10,2);
alter table public.player_snapshots add column if not exists total_wealth numeric(14,2);
alter table public.player_snapshots add column if not exists contracts_completed int;
alter table public.player_snapshots add column if not exists ultimate_zombies_defeated int;
alter table public.player_snapshots add column if not exists teammates_saved int;
alter table public.player_snapshots add column if not exists waves_cleared_solo int;

alter table public.matches add column if not exists source_import text;
alter table public.matches add column if not exists kd_ratio numeric(8,2);
alter table public.matches add column if not exists accuracy_percent numeric(8,2);
alter table public.matches add column if not exists headshot_percent numeric(8,2);

alter table public.match_player_stats add column if not exists objective_time_seconds int not null default 0;
alter table public.match_player_stats add column if not exists impact int not null default 0;
alter table public.match_player_stats add column if not exists team_side text check (team_side in ('blue','red'));
alter table public.match_player_stats add column if not exists raw_kda_text text;

alter table public.loadouts add column if not exists secondary_weapon text;
alter table public.loadouts add column if not exists character_name text;
alter table public.loadouts add column if not exists slot_index int;
alter table public.loadouts add column if not exists scorestreaks jsonb not null default '[]'::jsonb;
alter table public.loadouts add column if not exists screenshot_url text;

create table if not exists public.weapon_builds (
  id uuid primary key default gen_random_uuid(),
  clan_id uuid not null references public.clans(id) on delete cascade,
  player_id uuid references public.players(id) on delete set null,
  loadout_id uuid references public.loadouts(id) on delete set null,
  weapon_name text not null,
  blueprint_name text,
  muzzle text,
  barrel text,
  optic text,
  stock text,
  perk text,
  laser text,
  underbarrel text,
  ammunition text,
  rear_grip text,
  damage numeric(8,2),
  fire_rate numeric(8,2),
  accuracy numeric(8,2),
  mobility numeric(8,2),
  range_stat numeric(8,2),
  control numeric(8,2),
  screenshot_url text,
  created_at timestamptz not null default now()
);

create index if not exists idx_weapon_builds_clan on public.weapon_builds(clan_id);
create index if not exists idx_weapon_builds_player on public.weapon_builds(player_id);

alter table public.weapon_builds enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'weapon_builds' and policyname = 'weapon builds select members') then
    execute 'create policy "weapon builds select members" on public.weapon_builds for select to authenticated using (public.is_clan_member(clan_id))';
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'weapon_builds' and policyname = 'weapon builds insert admins') then
    execute 'create policy "weapon builds insert admins" on public.weapon_builds for insert to authenticated with check (public.is_clan_admin(clan_id))';
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'weapon_builds' and policyname = 'weapon builds update admins') then
    execute 'create policy "weapon builds update admins" on public.weapon_builds for update to authenticated using (public.is_clan_admin(clan_id)) with check (public.is_clan_admin(clan_id))';
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'weapon_builds' and policyname = 'weapon builds delete admins') then
    execute 'create policy "weapon builds delete admins" on public.weapon_builds for delete to authenticated using (public.is_clan_admin(clan_id))';
  end if;
end $$;





-- =============================================================
-- 0.2 extensions for screenshot stats core - included for fresh installs
-- =============================================================
-- CODM Clan Intelligence Cloud - MIGRAZIONE 0.2
-- Esegui questo file UNA SOLA VOLTA su Supabase SQL Editor se parti dalla 0.1 già funzionante.
-- Non cancella dati esistenti: aggiunge colonne/tabelle nuove.

alter table public.player_snapshots add column if not exists wins_count int;
alter table public.player_snapshots add column if not exists avg_damage numeric(10,2);
alter table public.player_snapshots add column if not exists zombie_ultimate_defeated int;
alter table public.player_snapshots add column if not exists teammates_saved int;
alter table public.player_snapshots add column if not exists waves_cleared_solo int;
alter table public.player_snapshots add column if not exists extraction_rate numeric(8,2);
alter table public.player_snapshots add column if not exists profit_loss_ratio numeric(10,2);
alter table public.player_snapshots add column if not exists total_wealth int;
alter table public.player_snapshots add column if not exists contracts_completed int;
alter table public.player_snapshots add column if not exists snapshot_data jsonb not null default '{}'::jsonb;

alter table public.match_player_stats add column if not exists impact int;
alter table public.match_player_stats add column if not exists objective_time_seconds int;
alter table public.match_player_stats add column if not exists objective_time_text text;
alter table public.match_player_stats add column if not exists accuracy_percent numeric(8,2);
alter table public.match_player_stats add column if not exists headshot_percent numeric(8,2);
alter table public.match_player_stats add column if not exists kd_ratio numeric(8,2);
alter table public.match_player_stats add column if not exists raw_kda_text text;
alter table public.match_player_stats add column if not exists team_side text default 'ALLY' check (team_side in ('ALLY','ENEMY'));
alter table public.match_player_stats add column if not exists rank_position int;

alter table public.loadouts add column if not exists slot_index int;
alter table public.loadouts add column if not exists secondary_weapon text;
alter table public.loadouts add column if not exists scorestreaks jsonb not null default '[]'::jsonb;
alter table public.loadouts add column if not exists character_name text;
alter table public.loadouts add column if not exists screenshot_url text;
alter table public.loadouts add column if not exists notes text;

create table if not exists public.weapon_builds (
  id uuid primary key default gen_random_uuid(),
  clan_id uuid not null references public.clans(id) on delete cascade,
  player_id uuid references public.players(id) on delete set null,
  weapon_name text not null,
  blueprint_name text,
  muzzle text,
  barrel text,
  optic text,
  stock text,
  perk text,
  laser text,
  underbarrel text,
  ammunition text,
  rear_grip text,
  damage int,
  fire_rate int,
  accuracy int,
  mobility int,
  range int,
  control int,
  screenshot_url text,
  notes text,
  created_at timestamptz not null default now()
);

alter table public.weapon_builds enable row level security;

drop policy if exists "weapon builds select members" on public.weapon_builds;
create policy "weapon builds select members" on public.weapon_builds for select to authenticated using (public.is_clan_member(clan_id));
drop policy if exists "weapon builds insert admins" on public.weapon_builds;
create policy "weapon builds insert admins" on public.weapon_builds for insert to authenticated with check (public.is_clan_admin(clan_id));
drop policy if exists "weapon builds update admins" on public.weapon_builds;
create policy "weapon builds update admins" on public.weapon_builds for update to authenticated using (public.is_clan_admin(clan_id)) with check (public.is_clan_admin(clan_id));
drop policy if exists "weapon builds delete admins" on public.weapon_builds;
create policy "weapon builds delete admins" on public.weapon_builds for delete to authenticated using (public.is_clan_admin(clan_id));

alter table public.screenshot_imports drop constraint if exists screenshot_imports_import_type_check;
alter table public.screenshot_imports add constraint screenshot_imports_import_type_check
check (import_type in ('profile','profile_base','multiplayer','battle_royale','zombie','dmz','scoreboard','loadout','weapon','chat'));

create index if not exists idx_stats_match_side on public.match_player_stats(match_id, team_side);
create index if not exists idx_snapshots_player_type on public.player_snapshots(player_id, source_type, imported_at desc);
create index if not exists idx_loadouts_player on public.loadouts(player_id);
create index if not exists idx_weapon_builds_player on public.weapon_builds(player_id);

-- =============================================================
-- 0.9F MATCH OCR STABLE - screenshot proof, notes, classifica 1-5 entrambe squadre
-- =============================================================
alter table public.matches add column if not exists screenshot_storage_path text;
alter table public.matches add column if not exists winning_team text check (winning_team in ('blue','red','draw'));
alter table public.matches add column if not exists our_team text check (our_team in ('blue','red'));
alter table public.matches add column if not exists match_notes text;
alter table public.screenshot_imports add column if not exists storage_path text;
alter table public.screenshot_imports add column if not exists match_id uuid references public.matches(id) on delete set null;

create table if not exists public.match_scoreboard_rows (
  id uuid primary key default gen_random_uuid(),
  clan_id uuid not null references public.clans(id) on delete cascade,
  match_id uuid not null references public.matches(id) on delete cascade,
  player_id uuid references public.players(id) on delete set null,
  nickname_raw text,
  nickname_resolved text,
  team_color text not null check (team_color in ('blue','red')),
  team_side text not null check (team_side in ('ALLY','ENEMY')),
  team_result text check (team_result in ('winner','loser','draw')),
  team_rank int check (team_rank between 1 and 5),
  kills int not null default 0,
  deaths int not null default 0,
  assists int not null default 0,
  score int not null default 0,
  impact int,
  mvp_type text,
  read_status text,
  needs_review boolean not null default true,
  created_at timestamptz not null default now(),
  unique (match_id, team_color, team_rank)
);

create index if not exists idx_scoreboard_rows_match on public.match_scoreboard_rows(match_id, team_color, team_rank);
create index if not exists idx_scoreboard_rows_player on public.match_scoreboard_rows(player_id);

alter table public.match_scoreboard_rows enable row level security;

drop policy if exists "scoreboard rows select members" on public.match_scoreboard_rows;
create policy "scoreboard rows select members" on public.match_scoreboard_rows for select to authenticated using (public.is_clan_member(clan_id));
drop policy if exists "scoreboard rows insert admins" on public.match_scoreboard_rows;
create policy "scoreboard rows insert admins" on public.match_scoreboard_rows for insert to authenticated with check (public.is_clan_admin(clan_id));
drop policy if exists "scoreboard rows update admins" on public.match_scoreboard_rows;
create policy "scoreboard rows update admins" on public.match_scoreboard_rows for update to authenticated using (public.is_clan_admin(clan_id)) with check (public.is_clan_admin(clan_id));
drop policy if exists "scoreboard rows delete admins" on public.match_scoreboard_rows;
create policy "scoreboard rows delete admins" on public.match_scoreboard_rows for delete to authenticated using (public.is_clan_admin(clan_id));
-- CODM Clan Intelligence 1.1 PROFILE ROSTER STABLE
-- Player manuali/guest, clan appartenenza, archivio partite filtrabile, cancellazione partite.

alter table public.players add column if not exists clan_name text;
alter table public.players add column if not exists account_level int;
alter table public.players add column if not exists rank_mp_best text;
alter table public.players add column if not exists rank_br_best text;

-- Rende robusto team_side se in vecchie release era stato creato con check blue/red.
do $$
declare r record;
begin
  for r in
    select conname
    from pg_constraint
    where conrelid = 'public.match_player_stats'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) ilike '%team_side%'
  loop
    execute format('alter table public.match_player_stats drop constraint if exists %I', r.conname);
  end loop;
end $$;

alter table public.match_player_stats add column if not exists team_side text;
alter table public.match_player_stats add column if not exists rank_position int;
alter table public.match_player_stats add column if not exists kd_ratio numeric(8,2);
alter table public.match_player_stats add column if not exists raw_kda_text text;
alter table public.match_player_stats add column if not exists objective_time_text text;
alter table public.match_player_stats add column if not exists objective_time_seconds int;
alter table public.match_player_stats add column if not exists impact int;
alter table public.match_player_stats add constraint match_player_stats_team_side_1_1 check (team_side is null or team_side in ('ALLY','ENEMY'));

alter table public.matches add column if not exists screenshot_storage_path text;
alter table public.matches add column if not exists winning_team text check (winning_team in ('blue','red','draw'));
alter table public.matches add column if not exists our_team text check (our_team in ('blue','red'));
alter table public.matches add column if not exists match_notes text;

create table if not exists public.match_scoreboard_rows (
  id uuid primary key default gen_random_uuid(),
  clan_id uuid not null references public.clans(id) on delete cascade,
  match_id uuid not null references public.matches(id) on delete cascade,
  player_id uuid references public.players(id) on delete set null,
  nickname_raw text,
  nickname_resolved text,
  team_color text not null check (team_color in ('blue','red')),
  team_side text not null check (team_side in ('ALLY','ENEMY')),
  team_result text check (team_result in ('winner','loser','draw')),
  team_rank int check (team_rank between 1 and 5),
  kills int not null default 0,
  deaths int not null default 0,
  assists int not null default 0,
  score int not null default 0,
  impact int,
  mvp_type text,
  read_status text,
  needs_review boolean not null default true,
  created_at timestamptz not null default now(),
  unique (match_id, team_color, team_rank)
);

alter table public.screenshot_imports add column if not exists storage_path text;
alter table public.screenshot_imports add column if not exists match_id uuid references public.matches(id) on delete set null;

create table if not exists public.player_aliases (
  id uuid primary key default gen_random_uuid(),
  clan_id uuid not null references public.clans(id) on delete cascade,
  player_id uuid references public.players(id) on delete cascade,
  alias text not null,
  source text not null default 'manual_or_ocr',
  created_at timestamptz not null default now(),
  unique (clan_id, alias)
);

create index if not exists idx_players_clan_name on public.players(clan_id, clan_name);
create index if not exists idx_stats_match_side_rank on public.match_player_stats(match_id, team_side, rank_position);
create index if not exists idx_scoreboard_rows_match_1_1 on public.match_scoreboard_rows(match_id, team_color, team_rank);
create index if not exists idx_scoreboard_rows_player_1_1 on public.match_scoreboard_rows(player_id);
create index if not exists idx_player_aliases_player on public.player_aliases(player_id);

alter table public.match_scoreboard_rows enable row level security;
alter table public.player_aliases enable row level security;

drop policy if exists "scoreboard rows select members" on public.match_scoreboard_rows;
create policy "scoreboard rows select members" on public.match_scoreboard_rows for select to authenticated using (public.is_clan_member(clan_id));
drop policy if exists "scoreboard rows insert admins" on public.match_scoreboard_rows;
create policy "scoreboard rows insert admins" on public.match_scoreboard_rows for insert to authenticated with check (public.is_clan_admin(clan_id));
drop policy if exists "scoreboard rows update admins" on public.match_scoreboard_rows;
create policy "scoreboard rows update admins" on public.match_scoreboard_rows for update to authenticated using (public.is_clan_admin(clan_id)) with check (public.is_clan_admin(clan_id));
drop policy if exists "scoreboard rows delete admins" on public.match_scoreboard_rows;
create policy "scoreboard rows delete admins" on public.match_scoreboard_rows for delete to authenticated using (public.is_clan_admin(clan_id));

drop policy if exists "player aliases select members" on public.player_aliases;
create policy "player aliases select members" on public.player_aliases for select to authenticated using (public.is_clan_member(clan_id));
drop policy if exists "player aliases manage admins" on public.player_aliases;
create policy "player aliases manage admins" on public.player_aliases for all to authenticated using (public.is_clan_admin(clan_id)) with check (public.is_clan_admin(clan_id));
