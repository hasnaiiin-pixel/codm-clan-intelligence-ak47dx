-- CLAN MANAGER AK47DX V13.3
-- Script sicuro/idempotente: conferma colonne necessarie per associare account registrati ai player.

alter table if exists public.players add column if not exists user_id uuid references auth.users(id) on delete set null;
alter table if exists public.players add column if not exists updated_at timestamptz default now();
alter table if exists public.profiles add column if not exists player_nickname text;
alter table if exists public.profiles add column if not exists codm_uid text;
alter table if exists public.profiles add column if not exists display_name text;
alter table if exists public.profiles add column if not exists updated_at timestamptz default now();

create index if not exists idx_players_user_id on public.players(user_id);
create index if not exists idx_players_nickname_lower on public.players(lower(nickname));
