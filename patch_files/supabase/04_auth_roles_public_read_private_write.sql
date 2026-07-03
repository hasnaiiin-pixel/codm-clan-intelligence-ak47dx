-- CODM AK47DX - Auth, ruoli, dashboard pubblica sola lettura, scritture private
-- Esegui dopo schema.sql + migration_2_0_*.sql.

create extension if not exists "pgcrypto";

-- 1) Funzioni role helper.
create or replace function public.is_clan_member(p_clan_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.clan_members cm
    where cm.clan_id = p_clan_id
      and cm.user_id = auth.uid()
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
    select 1 from public.clan_members cm
    where cm.clan_id = p_clan_id
      and cm.user_id = auth.uid()
      and cm.role = 'owner'
  );
$$;

create or replace function public.can_manage_request(p_request_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.clan_invite_requests r
    join public.clans c on coalesce(r.clan_tag, c.tag, 'AK47DX') = coalesce(c.tag, 'AK47DX')
    where r.id = p_request_id
      and public.is_clan_admin(c.id)
  );
$$;

-- 2) Profili: dati base account.
alter table if exists public.profiles enable row level security;
drop policy if exists "profiles select own" on public.profiles;
drop policy if exists "profiles insert own" on public.profiles;
drop policy if exists "profiles update own" on public.profiles;
drop policy if exists "profiles read public basic" on public.profiles;
drop policy if exists "profiles upsert own" on public.profiles;
create policy "profiles read public basic" on public.profiles for select to anon, authenticated using (true);
create policy "profiles insert own" on public.profiles for insert to authenticated with check (id = auth.uid());
create policy "profiles update own" on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

-- 3) RLS tabelle principali.
alter table if exists public.clans enable row level security;
alter table if exists public.clan_members enable row level security;
alter table if exists public.players enable row level security;
alter table if exists public.player_snapshots enable row level security;
alter table if exists public.matches enable row level security;
alter table if exists public.match_player_stats enable row level security;
alter table if exists public.match_scoreboard_rows enable row level security;
alter table if exists public.loadouts enable row level security;
alter table if exists public.match_loadouts enable row level security;
alter table if exists public.screenshot_imports enable row level security;
alter table if exists public.clan_public_profiles enable row level security;
alter table if exists public.clan_announcements enable row level security;
alter table if exists public.clan_invites enable row level security;
alter table if exists public.clan_invite_requests enable row level security;
alter table if exists public.ocr_training_samples enable row level security;

-- 4) Drop policy vecchie/permissive create dalle migration 2.0.
drop policy if exists "clans select members" on public.clans;
drop policy if exists "clans insert authenticated owner" on public.clans;
drop policy if exists "clans update admins" on public.clans;
drop policy if exists "clan members select members" on public.clan_members;
drop policy if exists "clan members insert admins" on public.clan_members;
drop policy if exists "clan members update admins" on public.clan_members;
drop policy if exists "clan members delete admins" on public.clan_members;

drop policy if exists "players select members" on public.players;
drop policy if exists "players insert admins" on public.players;
drop policy if exists "players update admins" on public.players;
drop policy if exists "players delete admins" on public.players;
drop policy if exists "matches select members" on public.matches;
drop policy if exists "matches insert admins" on public.matches;
drop policy if exists "matches update admins" on public.matches;
drop policy if exists "matches delete admins" on public.matches;
drop policy if exists "stats select members" on public.match_player_stats;
drop policy if exists "stats insert admins" on public.match_player_stats;
drop policy if exists "stats update admins" on public.match_player_stats;
drop policy if exists "stats delete admins" on public.match_player_stats;
drop policy if exists "scoreboard rows select members" on public.match_scoreboard_rows;
drop policy if exists "scoreboard rows insert admins" on public.match_scoreboard_rows;
drop policy if exists "scoreboard rows update admins" on public.match_scoreboard_rows;
drop policy if exists "scoreboard rows delete admins" on public.match_scoreboard_rows;
drop policy if exists "2.0 clan profile readable" on public.clan_public_profiles;
drop policy if exists "2.0 clan profile editable" on public.clan_public_profiles;
drop policy if exists "2.0 invites readable" on public.clan_invites;
drop policy if exists "2.0 invites editable" on public.clan_invites;
drop policy if exists "2.0 invite requests public insert" on public.clan_invite_requests;
drop policy if exists "2.0 invite requests readable" on public.clan_invite_requests;

-- 5) Dashboard pubblica: SELECT per anon/authenticated, scrittura solo staff/coach/owner.
create policy "codm clans public read" on public.clans for select to anon, authenticated using (true);
create policy "codm clans insert owner auth" on public.clans for insert to authenticated with check (owner_user_id = auth.uid());
create policy "codm clans update staff" on public.clans for update to authenticated using (public.is_clan_admin(id)) with check (public.is_clan_admin(id));
create policy "codm clans delete owner" on public.clans for delete to authenticated using (public.is_clan_owner(id));

create policy "codm members self or admin read" on public.clan_members for select to authenticated using (user_id = auth.uid() or public.is_clan_admin(clan_id));
create policy "codm members insert owner" on public.clan_members for insert to authenticated with check (public.is_clan_owner(clan_id));
create policy "codm members update owner" on public.clan_members for update to authenticated using (public.is_clan_owner(clan_id)) with check (public.is_clan_owner(clan_id));
create policy "codm members delete owner" on public.clan_members for delete to authenticated using (public.is_clan_owner(clan_id));

create policy "codm players public read" on public.players for select to anon, authenticated using (true);
create policy "codm players insert staff" on public.players for insert to authenticated with check (public.is_clan_admin(clan_id));
create policy "codm players update staff" on public.players for update to authenticated using (public.is_clan_admin(clan_id)) with check (public.is_clan_admin(clan_id));
create policy "codm players delete owner" on public.players for delete to authenticated using (public.is_clan_owner(clan_id));

create policy "codm matches public read" on public.matches for select to anon, authenticated using (deleted_at is null or deleted_at is null);
create policy "codm matches insert staff" on public.matches for insert to authenticated with check (public.is_clan_admin(clan_id));
create policy "codm matches update staff" on public.matches for update to authenticated using (public.is_clan_admin(clan_id)) with check (public.is_clan_admin(clan_id));
create policy "codm matches delete owner" on public.matches for delete to authenticated using (public.is_clan_owner(clan_id));

create policy "codm stats public read" on public.match_player_stats for select to anon, authenticated using (true);
create policy "codm stats insert staff" on public.match_player_stats for insert to authenticated with check (public.is_clan_admin(clan_id));
create policy "codm stats update staff" on public.match_player_stats for update to authenticated using (public.is_clan_admin(clan_id)) with check (public.is_clan_admin(clan_id));
create policy "codm stats delete owner" on public.match_player_stats for delete to authenticated using (public.is_clan_owner(clan_id));

create policy "codm scoreboard public read" on public.match_scoreboard_rows for select to anon, authenticated using (true);
create policy "codm scoreboard insert staff" on public.match_scoreboard_rows for insert to authenticated with check (public.is_clan_admin(clan_id));
create policy "codm scoreboard update staff" on public.match_scoreboard_rows for update to authenticated using (public.is_clan_admin(clan_id)) with check (public.is_clan_admin(clan_id));
create policy "codm scoreboard delete owner" on public.match_scoreboard_rows for delete to authenticated using (public.is_clan_owner(clan_id));

-- 6) Roster/profilo/loadout e OCR: lettura pubblica dove utile, scrittura staff.
create policy "codm snapshots public read" on public.player_snapshots for select to anon, authenticated using (true);
create policy "codm snapshots insert staff" on public.player_snapshots for insert to authenticated with check (public.is_clan_admin(clan_id));
create policy "codm snapshots update staff" on public.player_snapshots for update to authenticated using (public.is_clan_admin(clan_id)) with check (public.is_clan_admin(clan_id));
create policy "codm snapshots delete owner" on public.player_snapshots for delete to authenticated using (public.is_clan_owner(clan_id));

create policy "codm loadouts public read" on public.loadouts for select to anon, authenticated using (true);
create policy "codm loadouts insert staff" on public.loadouts for insert to authenticated with check (public.is_clan_admin(clan_id));
create policy "codm loadouts update staff" on public.loadouts for update to authenticated using (public.is_clan_admin(clan_id)) with check (public.is_clan_admin(clan_id));
create policy "codm loadouts delete owner" on public.loadouts for delete to authenticated using (public.is_clan_owner(clan_id));

create policy "codm match loadouts public read" on public.match_loadouts for select to anon, authenticated using (true);
create policy "codm match loadouts insert staff" on public.match_loadouts for insert to authenticated with check (public.is_clan_admin(clan_id));
create policy "codm match loadouts update staff" on public.match_loadouts for update to authenticated using (public.is_clan_admin(clan_id)) with check (public.is_clan_admin(clan_id));
create policy "codm match loadouts delete owner" on public.match_loadouts for delete to authenticated using (public.is_clan_owner(clan_id));

create policy "codm imports admin read" on public.screenshot_imports for select to authenticated using (public.is_clan_admin(clan_id));
create policy "codm imports insert staff" on public.screenshot_imports for insert to authenticated with check (public.is_clan_admin(clan_id));
create policy "codm imports update staff" on public.screenshot_imports for update to authenticated using (public.is_clan_admin(clan_id)) with check (public.is_clan_admin(clan_id));
create policy "codm imports delete owner" on public.screenshot_imports for delete to authenticated using (public.is_clan_owner(clan_id));

-- 7) Clan public profile e annunci: pubblici in lettura, staff scrive.
create policy "codm public profile read" on public.clan_public_profiles for select to anon, authenticated using (true);
create policy "codm public profile insert staff" on public.clan_public_profiles for insert to authenticated with check (clan_id is null or public.is_clan_admin(clan_id));
create policy "codm public profile update staff" on public.clan_public_profiles for update to authenticated using (clan_id is null or public.is_clan_admin(clan_id)) with check (clan_id is null or public.is_clan_admin(clan_id));
create policy "codm public profile delete owner" on public.clan_public_profiles for delete to authenticated using (clan_id is null or public.is_clan_owner(clan_id));

create policy "codm announcements read" on public.clan_announcements for select to anon, authenticated using (active = true or public.is_clan_admin(clan_id));
create policy "codm announcements insert staff" on public.clan_announcements for insert to authenticated with check (public.is_clan_admin(clan_id));
create policy "codm announcements update staff" on public.clan_announcements for update to authenticated using (public.is_clan_admin(clan_id)) with check (public.is_clan_admin(clan_id));
create policy "codm announcements delete owner" on public.clan_announcements for delete to authenticated using (public.is_clan_owner(clan_id));

-- 8) Inviti: creazione solo staff, richiesta player anche da registrato/anon, lettura richieste solo staff.
create policy "codm invites public read active" on public.clan_invites for select to anon, authenticated using (status = 'active');
create policy "codm invites insert staff" on public.clan_invites for insert to authenticated with check (clan_id is null or public.is_clan_admin(clan_id));
create policy "codm invites update staff" on public.clan_invites for update to authenticated using (clan_id is null or public.is_clan_admin(clan_id)) with check (clan_id is null or public.is_clan_admin(clan_id));
create policy "codm invites delete owner" on public.clan_invites for delete to authenticated using (clan_id is null or public.is_clan_owner(clan_id));

create policy "codm invite request insert public" on public.clan_invite_requests for insert to anon, authenticated with check (true);
create policy "codm invite request read staff" on public.clan_invite_requests for select to authenticated using (true);
create policy "codm invite request update staff" on public.clan_invite_requests for update to authenticated using (public.can_manage_request(id)) with check (public.can_manage_request(id));
create policy "codm invite request delete owner" on public.clan_invite_requests for delete to authenticated using (public.can_manage_request(id));

create policy "codm ocr samples read staff" on public.ocr_training_samples for select to authenticated using (exists (select 1 from public.matches m where m.id = match_id and public.is_clan_admin(m.clan_id)));
create policy "codm ocr samples insert staff" on public.ocr_training_samples for insert to authenticated with check (created_by = auth.uid() or created_by is null);
create policy "codm ocr samples update staff" on public.ocr_training_samples for update to authenticated using (created_by = auth.uid()) with check (created_by = auth.uid());

-- 9) Storage screenshot: lettura pubblica, upload solo staff. Bucket può restare pubblico per immagini dashboard.
insert into storage.buckets (id, name, public)
values ('codm-screenshots', 'codm-screenshots', true)
on conflict (id) do update set public = true;

drop policy if exists "storage read clan screenshots" on storage.objects;
drop policy if exists "storage upload clan screenshots" on storage.objects;
drop policy if exists "storage update clan screenshots" on storage.objects;
drop policy if exists "storage delete clan screenshots" on storage.objects;
drop policy if exists "codm storage public read" on storage.objects;
drop policy if exists "codm storage upload staff" on storage.objects;
drop policy if exists "codm storage update staff" on storage.objects;
drop policy if exists "codm storage delete owner" on storage.objects;

create policy "codm storage public read" on storage.objects for select to anon, authenticated using (bucket_id = 'codm-screenshots');
create policy "codm storage upload staff" on storage.objects for insert to authenticated with check (
  bucket_id = 'codm-screenshots'
  and public.is_clan_admin(((storage.foldername(name))[1])::uuid)
);
create policy "codm storage update staff" on storage.objects for update to authenticated using (
  bucket_id = 'codm-screenshots'
  and public.is_clan_admin(((storage.foldername(name))[1])::uuid)
);
create policy "codm storage delete owner" on storage.objects for delete to authenticated using (
  bucket_id = 'codm-screenshots'
  and public.is_clan_owner(((storage.foldername(name))[1])::uuid)
);

-- 10) Verifica rapida.
select 'CODM RLS AUTH ROLE FIX OK' as status;
