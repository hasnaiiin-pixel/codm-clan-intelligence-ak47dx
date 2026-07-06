-- CODM Clan Manager V6.8 - Main Admin Owner Fix
-- Eseguire una volta in Supabase SQL Editor.
-- Obiettivo: hasnaiiin@gmail.com diventa admin principale/owner del clan AK47DX e può modificare tutto.

create extension if not exists "pgcrypto";

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
  select public.is_codm_main_admin()
  or exists (
    select 1
    from public.clan_members cm
    where cm.clan_id = p_clan_id
      and cm.user_id = auth.uid()
      and cm.role = 'owner'
  );
$$;

DO $$
DECLARE
  v_admin_email text := 'hasnaiiin@gmail.com';
  v_user_id uuid;
  v_clan_id uuid;
  v_member_id uuid;
BEGIN
  select id into v_user_id
  from auth.users
  where lower(email) = lower(v_admin_email)
  limit 1;

  if v_user_id is null then
    raise notice 'Utente % non trovato in auth.users. Fai prima login/registrazione con questa email, poi rilancia questo SQL.', v_admin_email;
    return;
  end if;

  select id into v_clan_id
  from public.clans
  where owner_user_id = v_user_id
     or lower(name) = lower('AK47DX')
     or lower(coalesce(tag,'')) in ('ak47dx','ak')
  order by created_at asc
  limit 1;

  if v_clan_id is null then
    insert into public.clans (name, tag, owner_user_id)
    values ('AK47DX', 'AK47DX', v_user_id)
    returning id into v_clan_id;
  else
    update public.clans
    set owner_user_id = v_user_id,
        name = case when nullif(trim(coalesce(name,'')), '') is null then 'AK47DX' else name end,
        tag = case when lower(coalesce(tag,'')) in ('', 'ak', 'akঐ', 'ѧҝ', 'ѧҝঐ', 'senza clan', 'default') then 'AK47DX' else tag end
    where id = v_clan_id;
  end if;

  select id into v_member_id
  from public.clan_members
  where clan_id = v_clan_id and user_id = v_user_id
  limit 1;

  if v_member_id is null then
    insert into public.clan_members (clan_id, user_id, role)
    values (v_clan_id, v_user_id, 'owner');
  else
    update public.clan_members
    set role = 'owner'
    where id = v_member_id;
  end if;

  update public.players
  set clan_name = 'AK47DX'
  where clan_id = v_clan_id
    and lower(coalesce(clan_name,'')) in ('ak', 'akঐ', 'ѧҝ', 'ѧҝঐ', 'senza clan', 'default', '');

  raise notice 'OK: % è owner/admin principale del clan %', v_admin_email, v_clan_id;
END $$;

select 'CODM V6.8 MAIN ADMIN OWNER FIX OK' as status;
