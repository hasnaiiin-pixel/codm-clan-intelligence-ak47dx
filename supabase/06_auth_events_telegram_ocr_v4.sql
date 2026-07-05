-- CODM AK47DX V4 - Auth registrazione, permessi, eventi, telegram reminders, OCR status base

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  player_nickname text,
  codm_uid text,
  telegram_username text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.profiles add column if not exists display_name text;
alter table public.profiles add column if not exists player_nickname text;
alter table public.profiles add column if not exists codm_uid text;
alter table public.profiles add column if not exists telegram_username text;
alter table public.profiles add column if not exists created_at timestamptz default now();
alter table public.profiles add column if not exists updated_at timestamptz default now();

alter table public.clan_invite_requests add column if not exists user_id uuid references auth.users(id) on delete cascade;
alter table public.clan_invite_requests add column if not exists nickname text;
alter table public.clan_invite_requests add column if not exists uid_codm text;
alter table public.clan_invite_requests add column if not exists social_contact text;
alter table public.clan_invite_requests add column if not exists status text default 'pending';
alter table public.clan_invite_requests add column if not exists linked_player_id uuid;
alter table public.clan_invite_requests add column if not exists approved_at timestamptz;
alter table public.clan_invite_requests add column if not exists approved_by uuid;
alter table public.clan_invite_requests add column if not exists updated_at timestamptz default now();

create table if not exists public.codm_events (
  id uuid primary key default gen_random_uuid(),
  clan_id uuid references public.clans(id) on delete cascade,
  title text not null,
  description text,
  starts_at timestamptz not null,
  ends_at timestamptz,
  location text,
  event_type text default 'scrim',
  visibility text default 'public',
  telegram_enabled boolean default true,
  google_calendar_url text,
  reminder_2h_sent_at timestamptz,
  reminder_10m_sent_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_codm_events_starts_at on public.codm_events(starts_at);
create index if not exists idx_codm_events_clan_id on public.codm_events(clan_id);

create or replace function public.codm_is_clan_writer(target_clan_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.clan_members cm
    where cm.clan_id = target_clan_id
      and cm.user_id = auth.uid()
      and cm.role in ('owner','coach','staff')
  );
$$;

create or replace function public.codm_is_clan_owner(target_clan_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.clan_members cm
    where cm.clan_id = target_clan_id
      and cm.user_id = auth.uid()
      and cm.role = 'owner'
  );
$$;

alter table public.profiles enable row level security;
alter table public.codm_events enable row level security;

-- Profiles: owner gestisce, utente vede/modifica se stesso.
drop policy if exists profiles_select_self_or_owner on public.profiles;
create policy profiles_select_self_or_owner on public.profiles for select using (
  auth.uid() = id or exists (select 1 from public.clan_members cm where cm.user_id = auth.uid() and cm.role = 'owner')
);

drop policy if exists profiles_insert_self on public.profiles;
create policy profiles_insert_self on public.profiles for insert with check (auth.uid() = id);

drop policy if exists profiles_update_self_or_owner on public.profiles;
create policy profiles_update_self_or_owner on public.profiles for update using (
  auth.uid() = id or exists (select 1 from public.clan_members cm where cm.user_id = auth.uid() and cm.role = 'owner')
);

-- Eventi: lettura pubblica, scrittura solo staff/coach/owner.
drop policy if exists codm_events_public_read on public.codm_events;
create policy codm_events_public_read on public.codm_events for select using (true);

drop policy if exists codm_events_writer_insert on public.codm_events;
create policy codm_events_writer_insert on public.codm_events for insert with check (public.codm_is_clan_writer(clan_id));

drop policy if exists codm_events_writer_update on public.codm_events;
create policy codm_events_writer_update on public.codm_events for update using (public.codm_is_clan_writer(clan_id));

drop policy if exists codm_events_owner_delete on public.codm_events;
create policy codm_events_owner_delete on public.codm_events for delete using (public.codm_is_clan_owner(clan_id));

-- Richieste invito: utente crea la propria richiesta, owner/staff gestisce.
alter table public.clan_invite_requests enable row level security;
drop policy if exists invite_requests_select_self_or_owner on public.clan_invite_requests;
create policy invite_requests_select_self_or_owner on public.clan_invite_requests for select using (
  user_id = auth.uid() or exists (select 1 from public.clan_members cm where cm.clan_id = clan_invite_requests.clan_id and cm.user_id = auth.uid() and cm.role in ('owner','coach','staff'))
);

drop policy if exists invite_requests_insert_self on public.clan_invite_requests;
create policy invite_requests_insert_self on public.clan_invite_requests for insert with check (user_id = auth.uid() or user_id is null);

drop policy if exists invite_requests_update_staff on public.clan_invite_requests;
create policy invite_requests_update_staff on public.clan_invite_requests for update using (
  exists (select 1 from public.clan_members cm where cm.clan_id = clan_invite_requests.clan_id and cm.user_id = auth.uid() and cm.role in ('owner','coach','staff'))
);

create or replace function public.codm_handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_clan_id uuid;
  v_name text;
  v_nickname text;
  v_uid text;
begin
  v_name := coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1), 'Nuovo player');
  v_nickname := coalesce(new.raw_user_meta_data->>'player_nickname', v_name);
  v_uid := nullif(new.raw_user_meta_data->>'codm_uid', '');

  insert into public.profiles (id, display_name, player_nickname, codm_uid, updated_at)
  values (new.id, v_name, v_nickname, v_uid, now())
  on conflict (id) do update set
    display_name = excluded.display_name,
    player_nickname = excluded.player_nickname,
    codm_uid = excluded.codm_uid,
    updated_at = now();

  select id into v_clan_id from public.clans order by created_at asc limit 1;
  if v_clan_id is not null then
    insert into public.clan_invite_requests (clan_id, user_id, nickname, uid_codm, social_contact, status, updated_at)
    select v_clan_id, new.id, v_nickname, v_uid, new.email, 'pending', now()
    where not exists (
      select 1 from public.clan_invite_requests where clan_id = v_clan_id and user_id = new.id
    );
  end if;
  return new;
end;
$$;

drop trigger if exists codm_on_auth_user_created on auth.users;
create trigger codm_on_auth_user_created
  after insert on auth.users
  for each row execute function public.codm_handle_new_user();
