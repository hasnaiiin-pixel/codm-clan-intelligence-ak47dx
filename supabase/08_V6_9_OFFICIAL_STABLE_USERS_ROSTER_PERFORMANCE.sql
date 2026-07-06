-- CODM Clan Manager V6.9 - Official Stable Users/Roster/Owner Fix
-- Eseguire una volta in Supabase SQL Editor dopo il deploy.
-- Obiettivo: lista utenti visibile in Gestione utenti, sync registrati -> profili -> roster, owner principale permanente.

create extension if not exists "pgcrypto";

-- Colonne profilo usate dalla app.
alter table if exists public.profiles add column if not exists email text;
alter table if exists public.profiles add column if not exists display_name text;
alter table if exists public.profiles add column if not exists player_nickname text;
alter table if exists public.profiles add column if not exists codm_uid text;
alter table if exists public.profiles add column if not exists telegram_username text;
alter table if exists public.profiles add column if not exists updated_at timestamptz default now();

-- Colonne roster usate dalla app.
alter table if exists public.players add column if not exists user_id uuid references auth.users(id) on delete set null;
alter table if exists public.players add column if not exists clan_name text;
alter table if exists public.players add column if not exists uid_codm text;
alter table if exists public.players add column if not exists status text default 'active';
alter table if exists public.players add column if not exists notes text;
alter table if exists public.players add column if not exists avatar_url text;

create index if not exists idx_codm_players_user_id on public.players(user_id);
create index if not exists idx_codm_players_clan_user on public.players(clan_id, user_id);
create index if not exists idx_codm_profiles_email on public.profiles(lower(email));

create or replace function public.is_codm_main_admin()
returns boolean
language sql
stable
as $$
  select lower(coalesce(auth.jwt() ->> 'email', '')) = 'hasnaiiin@gmail.com';
$$;

create or replace function public.is_clan_admin(p_clan_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select public.is_codm_main_admin()
  or exists (
    select 1 from public.clan_members cm
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
  select public.is_codm_main_admin()
  or exists (
    select 1 from public.clan_members cm
    where cm.clan_id = p_clan_id
      and cm.user_id = auth.uid()
      and cm.role = 'owner'
  );
$$;

-- RLS più chiara: la pagina admin usa service role server, ma queste policy mantengono l'app leggibile/scrivibile dove serve.
alter table if exists public.profiles enable row level security;
alter table if exists public.clan_members enable row level security;
alter table if exists public.players enable row level security;

drop policy if exists "v6_9 profiles self owner read" on public.profiles;
create policy "v6_9 profiles self owner read" on public.profiles for select to authenticated using (
  id = auth.uid() or public.is_codm_main_admin()
);

drop policy if exists "v6_9 profiles self upsert" on public.profiles;
create policy "v6_9 profiles self upsert" on public.profiles for insert to authenticated with check (id = auth.uid() or public.is_codm_main_admin());

drop policy if exists "v6_9 profiles self update" on public.profiles;
create policy "v6_9 profiles self update" on public.profiles for update to authenticated using (id = auth.uid() or public.is_codm_main_admin()) with check (id = auth.uid() or public.is_codm_main_admin());

drop policy if exists "v6_9 clan members self owner read" on public.clan_members;
create policy "v6_9 clan members self owner read" on public.clan_members for select to authenticated using (
  user_id = auth.uid() or public.is_clan_owner(clan_id)
);

drop policy if exists "v6_9 clan members owner insert" on public.clan_members;
create policy "v6_9 clan members owner insert" on public.clan_members for insert to authenticated with check (public.is_clan_owner(clan_id));

drop policy if exists "v6_9 clan members owner update" on public.clan_members;
create policy "v6_9 clan members owner update" on public.clan_members for update to authenticated using (public.is_clan_owner(clan_id)) with check (public.is_clan_owner(clan_id));

drop policy if exists "v6_9 players public read" on public.players;
create policy "v6_9 players public read" on public.players for select to anon, authenticated using (true);

drop policy if exists "v6_9 players self staff insert" on public.players;
create policy "v6_9 players self staff insert" on public.players for insert to authenticated with check (
  user_id = auth.uid() or public.is_clan_admin(clan_id)
);

drop policy if exists "v6_9 players self staff update" on public.players;
create policy "v6_9 players self staff update" on public.players for update to authenticated using (
  user_id = auth.uid() or public.is_clan_admin(clan_id)
) with check (
  user_id = auth.uid() or public.is_clan_admin(clan_id)
);

-- Owner principale e clan ufficiale.
DO $$
DECLARE
  v_admin_email text := 'hasnaiiin@gmail.com';
  v_user_id uuid;
  v_clan_id uuid;
BEGIN
  select id into v_user_id from auth.users where lower(email) = lower(v_admin_email) limit 1;

  if v_user_id is null then
    raise notice 'Utente % non trovato in auth.users. Fai prima login/registrazione con questa email, poi rilancia questo SQL.', v_admin_email;
    return;
  end if;

  select id into v_clan_id
  from public.clans
  where owner_user_id = v_user_id
     or lower(name) = lower('AK47DX')
     or lower(coalesce(tag,'')) in ('ak47dx','ak','ѧҝ','ѧҝঐ')
  order by created_at asc
  limit 1;

  if v_clan_id is null then
    insert into public.clans (name, tag, owner_user_id)
    values ('AK47DX', 'AK47DX', v_user_id)
    returning id into v_clan_id;
  else
    update public.clans
    set owner_user_id = v_user_id,
        name = coalesce(nullif(trim(name), ''), 'AK47DX'),
        tag = 'AK47DX'
    where id = v_clan_id;
  end if;

  insert into public.clan_members (clan_id, user_id, role)
  values (v_clan_id, v_user_id, 'owner')
  on conflict (clan_id, user_id) do update set role = 'owner';

  insert into public.profiles (id, email, display_name, player_nickname, updated_at)
  values (v_user_id, v_admin_email, 'Hasnain Mirza', 'MIRZA', now())
  on conflict (id) do update set email = excluded.email, updated_at = now();

  update public.players
  set clan_name = 'AK47DX'
  where clan_id = v_clan_id
    and lower(coalesce(clan_name,'')) in ('ak', 'akঐ', 'ѧҝ', 'ѧҝঐ', 'senza clan', 'default', '');

  raise notice 'OK V6.9: % è owner/admin principale del clan %', v_admin_email, v_clan_id;
END $$;

select 'CODM V6.9 OFFICIAL STABLE USERS ROSTER SQL OK' as status;
