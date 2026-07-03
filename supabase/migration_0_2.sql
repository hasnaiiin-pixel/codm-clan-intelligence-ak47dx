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
