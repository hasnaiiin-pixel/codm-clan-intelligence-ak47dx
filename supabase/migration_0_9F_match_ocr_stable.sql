-- CODM Clan Intelligence - MIGRAZIONE 0.9F MATCH OCR STABLE
-- Esegui in Supabase SQL Editor se aggiorni da una versione precedente.

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
