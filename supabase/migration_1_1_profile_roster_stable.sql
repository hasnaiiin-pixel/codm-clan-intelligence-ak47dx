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
