-- CODM AK47DX - Public Dashboard + Private Writes
-- Esegui in Supabase SQL Editor dopo schema.sql e migration 2.0.
-- Obiettivo:
-- 1) Dashboard pubblica in sola lettura anche senza login.
-- 2) Nessuna scrittura anonima.
-- 3) Scrittura/modifica solo per owner/coach/staff tramite policy già presenti e funzioni admin.

create extension if not exists "pgcrypto";

-- Helper: ruolo dell'utente loggato nel clan.
create or replace function public.codm_my_clan_role(p_clan_id uuid)
returns text
language sql
security definer
set search_path = public
stable
as $$
  select cm.role
  from public.clan_members cm
  where cm.clan_id = p_clan_id
    and cm.user_id = auth.uid()
  order by case cm.role
    when 'owner' then 1
    when 'coach' then 2
    when 'staff' then 3
    when 'player' then 4
    when 'viewer' then 5
    else 99
  end
  limit 1;
$$;

-- Helper: può gestire dati sensibili / caricare risultati / modificare pagine.
create or replace function public.codm_can_manage_clan(p_clan_id uuid)
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

grant execute on function public.codm_my_clan_role(uuid) to anon, authenticated;
grant execute on function public.codm_can_manage_clan(uuid) to anon, authenticated;

-- Lettura pubblica SOLO per le tabelle usate dalla dashboard.
-- Non include screenshot_imports / raw OCR / richieste invito.
do $$
declare
  t text;
begin
  foreach t in array array[
    'clans',
    'players',
    'matches',
    'match_player_stats',
    'match_scoreboard_rows'
  ] loop
    if to_regclass('public.' || t) is not null then
      execute format('alter table public.%I enable row level security', t);
      execute format('grant select on public.%I to anon, authenticated', t);
      execute format('revoke insert, update, delete on public.%I from anon', t);

      if not exists (
        select 1
        from pg_policies
        where schemaname = 'public'
          and tablename = t
          and policyname = 'codm public dashboard read'
      ) then
        execute format('create policy "codm public dashboard read" on public.%I for select to anon, authenticated using (true)', t);
      end if;
    end if;
  end loop;
end $$;

-- Mantieni sicure le tabelle operative se esistono.
do $$
declare
  t text;
begin
  foreach t in array array[
    'screenshot_imports',
    'player_snapshots',
    'loadouts',
    'match_loadouts',
    'weapon_builds',
    'clan_invites',
    'clan_invite_requests',
    'ocr_training_samples',
    'yolo_dataset_exports',
    'app_deployment_settings'
  ] loop
    if to_regclass('public.' || t) is not null then
      execute format('alter table public.%I enable row level security', t);
      execute format('revoke insert, update, delete on public.%I from anon', t);
    end if;
  end loop;
end $$;
