-- CODM AK47DX - Auth users + admin approval hotfix
-- Esegui in Supabase SQL Editor prima del deploy frontend.

create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  created_at timestamptz not null default now()
);

alter table public.profiles add column if not exists display_name text;
alter table public.profiles add column if not exists created_at timestamptz not null default now();

create table if not exists public.clan_invite_requests (
  id uuid primary key default gen_random_uuid(),
  clan_id uuid references public.clans(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  nickname text not null,
  uid_codm text,
  social_contact text,
  status text not null default 'pending',
  linked_player_id uuid references public.players(id) on delete set null,
  approved_at timestamptz,
  approved_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.clan_invite_requests add column if not exists clan_id uuid references public.clans(id) on delete cascade;
alter table public.clan_invite_requests add column if not exists user_id uuid references auth.users(id) on delete cascade;
alter table public.clan_invite_requests add column if not exists nickname text;
alter table public.clan_invite_requests add column if not exists uid_codm text;
alter table public.clan_invite_requests add column if not exists social_contact text;
alter table public.clan_invite_requests add column if not exists status text not null default 'pending';
alter table public.clan_invite_requests add column if not exists linked_player_id uuid references public.players(id) on delete set null;
alter table public.clan_invite_requests add column if not exists approved_at timestamptz;
alter table public.clan_invite_requests add column if not exists approved_by uuid references auth.users(id) on delete set null;
alter table public.clan_invite_requests add column if not exists created_at timestamptz not null default now();
alter table public.clan_invite_requests add column if not exists updated_at timestamptz not null default now();

create unique index if not exists idx_clan_invite_requests_clan_user
  on public.clan_invite_requests(clan_id, user_id)
  where user_id is not null;

create index if not exists idx_clan_invite_requests_status
  on public.clan_invite_requests(clan_id, status, created_at desc);

create or replace function public.is_clan_admin(p_clan_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.clan_members cm
    where cm.clan_id = p_clan_id
      and cm.user_id = auth.uid()
      and cm.role in ('owner','coach','staff')
  );
$$;

create or replace function public.is_clan_owner(p_clan_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.clan_members cm
    where cm.clan_id = p_clan_id
      and cm.user_id = auth.uid()
      and cm.role = 'owner'
  );
$$;

alter table public.profiles enable row level security;
alter table public.clan_invite_requests enable row level security;

-- Profiles policies
drop policy if exists "profiles select own" on public.profiles;
drop policy if exists "profiles insert own" on public.profiles;
drop policy if exists "profiles update own" on public.profiles;
drop policy if exists "profiles select owner same clan" on public.profiles;

create policy "profiles select own or owner same clan"
on public.profiles
for select
to authenticated
using (
  id = auth.uid()
  or exists (
    select 1
    from public.clan_members owner_cm
    join public.clan_members user_cm on user_cm.clan_id = owner_cm.clan_id
    where owner_cm.user_id = auth.uid()
      and owner_cm.role = 'owner'
      and user_cm.user_id = public.profiles.id
  )
);

create policy "profiles insert own"
on public.profiles
for insert
to authenticated
with check (id = auth.uid());

create policy "profiles update own"
on public.profiles
for update
to authenticated
using (id = auth.uid())
with check (id = auth.uid());

-- Join request policies
drop policy if exists "join requests select own or admins" on public.clan_invite_requests;
drop policy if exists "join requests insert own" on public.clan_invite_requests;
drop policy if exists "join requests update own or admins" on public.clan_invite_requests;
drop policy if exists "join requests delete owners" on public.clan_invite_requests;

create policy "join requests select own or admins"
on public.clan_invite_requests
for select
to authenticated
using (
  user_id = auth.uid()
  or public.is_clan_admin(clan_id)
);

create policy "join requests insert own"
on public.clan_invite_requests
for insert
to authenticated
with check (user_id = auth.uid());

create policy "join requests update own or admins"
on public.clan_invite_requests
for update
to authenticated
using (user_id = auth.uid() or public.is_clan_admin(clan_id))
with check (user_id = auth.uid() or public.is_clan_admin(clan_id));

create policy "join requests delete owners"
on public.clan_invite_requests
for delete
to authenticated
using (public.is_clan_owner(clan_id));

-- Rendi la dashboard pubblica in sola lettura, ma scrittura resta protetta dalle policy admin già esistenti.
drop policy if exists "clans public read" on public.clans;
drop policy if exists "players public read" on public.players;
drop policy if exists "matches public read" on public.matches;
drop policy if exists "match stats public read" on public.match_player_stats;
drop policy if exists "scoreboard rows public read" on public.match_scoreboard_rows;

create policy "clans public read" on public.clans for select using (true);
create policy "players public read" on public.players for select using (true);
create policy "matches public read" on public.matches for select using (true);
create policy "match stats public read" on public.match_player_stats for select using (true);

do $$
begin
  if to_regclass('public.match_scoreboard_rows') is not null then
    execute 'create policy "scoreboard rows public read" on public.match_scoreboard_rows for select using (true)';
  end if;
exception when duplicate_object then
  null;
end $$;
