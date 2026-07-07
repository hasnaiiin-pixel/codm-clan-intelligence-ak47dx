-- CLAN MANAGER AK47DX V8.1 - EVENTS EDIT/DELETE/TELEGRAM CLEAN FINAL
-- Eseguire una volta in Supabase SQL Editor.
-- Obiettivo: un solo database eventi, cancellazione/modifica sicura, Telegram immediato da API server.

create extension if not exists pgcrypto;

create table if not exists public.clans (
  id uuid primary key default gen_random_uuid(),
  name text,
  tag text,
  owner_user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.clan_members (
  id uuid primary key default gen_random_uuid(),
  clan_id uuid references public.clans(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  role text default 'player',
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(clan_id, user_id)
);

-- Compatibilità database esistenti: CREATE TABLE IF NOT EXISTS non aggiunge colonne mancanti.
-- Queste ALTER rendono lo script rieseguibile anche se le tabelle clans/clan_members erano nate in versioni vecchie.
alter table public.clans add column if not exists name text;
alter table public.clans add column if not exists tag text;
alter table public.clans add column if not exists owner_user_id uuid references auth.users(id) on delete set null;
alter table public.clans add column if not exists created_at timestamptz default now();
alter table public.clans add column if not exists updated_at timestamptz default now();

alter table public.clan_members add column if not exists clan_id uuid references public.clans(id) on delete cascade;
alter table public.clan_members add column if not exists user_id uuid references auth.users(id) on delete cascade;
alter table public.clan_members add column if not exists role text default 'player';
alter table public.clan_members add column if not exists created_at timestamptz default now();
alter table public.clan_members add column if not exists updated_at timestamptz default now();

-- Clan ufficiale unico usato dagli eventi.
do $$
declare
  v_admin uuid;
  v_clan uuid;
begin
  select id into v_admin from auth.users where lower(email) = 'hasnaiiin@gmail.com' order by created_at asc limit 1;

  select id into v_clan
  from public.clans
  where upper(coalesce(tag,'')) in ('AK47DX','AK') or upper(coalesce(name,'')) = 'AK47DX'
  order by created_at asc
  limit 1;

  if v_clan is null then
    insert into public.clans(name, tag, owner_user_id)
    values ('AK47DX', 'AK47DX', v_admin)
    returning id into v_clan;
  else
    update public.clans
       set name = coalesce(nullif(name,''), 'AK47DX'),
           tag = coalesce(nullif(tag,''), 'AK47DX'),
           owner_user_id = coalesce(owner_user_id, v_admin),
           updated_at = now()
     where id = v_clan;
  end if;

  if v_admin is not null then
    update public.clan_members
       set role = 'owner',
           updated_at = now()
     where clan_id = v_clan
       and user_id = v_admin;

    if not exists (
      select 1 from public.clan_members
      where clan_id = v_clan and user_id = v_admin
    ) then
      insert into public.clan_members(clan_id, user_id, role, updated_at)
      values (v_clan, v_admin, 'owner', now());
    end if;
  end if;
end $$;

create table if not exists public.codm_events (
  id uuid primary key default gen_random_uuid(),
  clan_id uuid references public.clans(id) on delete cascade,
  title text not null default 'Evento CODM',
  description text,
  starts_at timestamptz not null default now(),
  ends_at timestamptz,
  location text,
  event_type text default 'scrim',
  visibility text default 'public',
  telegram_enabled boolean default true,
  google_calendar_url text,
  created_at timestamptz default now()
);

alter table public.codm_events add column if not exists event_plan jsonb default '{}'::jsonb;
alter table public.codm_events add column if not exists convocations jsonb default '[]'::jsonb;
alter table public.codm_events add column if not exists convocations_text text;
alter table public.codm_events add column if not exists reminder_minutes integer[] default array[120,60,30,10];
alter table public.codm_events add column if not exists telegram_message_template text;
alter table public.codm_events add column if not exists event_notes text;
alter table public.codm_events add column if not exists local_id text;
alter table public.codm_events add column if not exists sync_status text default 'synced';
alter table public.codm_events add column if not exists sync_error text;
alter table public.codm_events add column if not exists sent_reminders jsonb default '{}'::jsonb;
alter table public.codm_events add column if not exists reminder_2h_sent_at timestamptz;
alter table public.codm_events add column if not exists reminder_10m_sent_at timestamptz;
alter table public.codm_events add column if not exists created_by uuid references auth.users(id) on delete set null;
alter table public.codm_events add column if not exists updated_at timestamptz default now();
alter table public.codm_events alter column id set default gen_random_uuid();

create table if not exists public.codm_event_players (
  id uuid primary key default gen_random_uuid(),
  event_id uuid,
  clan_id uuid references public.clans(id) on delete cascade,
  player_id uuid references public.players(id) on delete set null,
  nickname text not null,
  status text default 'convocato',
  created_at timestamptz default now()
);

-- Ricrea FK evento con ON DELETE CASCADE anche se tabelle vecchie erano nate senza cascade.
alter table public.codm_event_players drop constraint if exists codm_event_players_event_id_fkey;
alter table public.codm_event_players
  add constraint codm_event_players_event_id_fkey
  foreign key (event_id) references public.codm_events(id) on delete cascade;

create table if not exists public.codm_notifications (
  id uuid primary key default gen_random_uuid(),
  clan_id uuid references public.clans(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  type text default 'system',
  title text not null,
  body text,
  metadata jsonb default '{}'::jsonb,
  dedupe_key text,
  read_at timestamptz,
  created_at timestamptz default now()
);

-- Pulizia eventi legacy/PWA: niente local_id, niente pending/error.
update public.codm_events
set local_id = null,
    sync_status = 'synced',
    sync_error = null,
    updated_at = coalesce(updated_at, now())
where local_id is not null
   or sync_status is distinct from 'synced'
   or sync_error is not null;

-- App monoclub AK47DX: porta eventi senza clan o con clan storico dentro il clan ufficiale.
do $$
declare
  v_clan uuid;
begin
  select id into v_clan
  from public.clans
  where upper(coalesce(tag,'')) in ('AK47DX','AK') or upper(coalesce(name,'')) = 'AK47DX'
  order by created_at asc
  limit 1;

  if v_clan is not null then
    update public.codm_events
       set clan_id = v_clan,
           updated_at = now()
     where clan_id is null
        or clan_id <> v_clan;

    update public.codm_event_players
       set clan_id = v_clan
     where clan_id is null
        or clan_id <> v_clan;
  end if;
end $$;

create index if not exists idx_codm_events_starts_at on public.codm_events(starts_at);
create index if not exists idx_codm_events_clan_id on public.codm_events(clan_id);
create index if not exists idx_codm_events_updated_at on public.codm_events(updated_at desc);
create index if not exists idx_codm_event_players_event_id on public.codm_event_players(event_id);
create index if not exists idx_codm_event_players_clan_id on public.codm_event_players(clan_id);
create index if not exists idx_codm_notifications_user_created on public.codm_notifications(user_id, created_at desc);
create index if not exists idx_codm_notifications_clan_created on public.codm_notifications(clan_id, created_at desc);
create index if not exists idx_codm_notifications_metadata on public.codm_notifications using gin(metadata);
create unique index if not exists codm_notifications_user_dedupe_unique
  on public.codm_notifications(user_id, dedupe_key)
  where dedupe_key is not null;

create or replace function public.codm_is_clan_writer(target_clan_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.clan_members cm
    where cm.clan_id = target_clan_id
      and cm.user_id = auth.uid()
      and cm.role in ('owner','coach','staff')
  );
$$;

create or replace function public.codm_delete_event_hard(p_event_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_deleted integer := 0;
begin
  delete from public.codm_event_players where event_id = p_event_id;
  delete from public.codm_notifications where metadata->>'event_id' = p_event_id::text;
  delete from public.codm_events where id = p_event_id;
  get diagnostics v_deleted = row_count;
  return v_deleted;
end;
$$;

alter table public.codm_events enable row level security;
alter table public.codm_event_players enable row level security;
alter table public.codm_notifications enable row level security;

drop policy if exists codm_events_public_read on public.codm_events;
create policy codm_events_public_read on public.codm_events for select using (true);

drop policy if exists codm_events_writer_insert on public.codm_events;
create policy codm_events_writer_insert on public.codm_events for insert with check (public.codm_is_clan_writer(clan_id));

drop policy if exists codm_events_writer_update on public.codm_events;
create policy codm_events_writer_update on public.codm_events for update using (public.codm_is_clan_writer(clan_id)) with check (public.codm_is_clan_writer(clan_id));

drop policy if exists codm_events_owner_delete on public.codm_events;
drop policy if exists codm_events_writer_delete on public.codm_events;
create policy codm_events_writer_delete on public.codm_events for delete using (public.codm_is_clan_writer(clan_id));

drop policy if exists codm_event_players_public_read on public.codm_event_players;
create policy codm_event_players_public_read on public.codm_event_players for select using (true);

drop policy if exists codm_event_players_writer_all on public.codm_event_players;
create policy codm_event_players_writer_all on public.codm_event_players for all using (public.codm_is_clan_writer(clan_id)) with check (public.codm_is_clan_writer(clan_id));

drop policy if exists codm_notifications_user_read on public.codm_notifications;
create policy codm_notifications_user_read on public.codm_notifications for select using (auth.uid() = user_id);

drop policy if exists codm_notifications_user_update on public.codm_notifications;
create policy codm_notifications_user_update on public.codm_notifications for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists codm_notifications_writer_insert on public.codm_notifications;
create policy codm_notifications_writer_insert on public.codm_notifications for insert with check (public.codm_is_clan_writer(clan_id) or auth.uid() = user_id);

drop policy if exists codm_notifications_writer_delete on public.codm_notifications;
create policy codm_notifications_writer_delete on public.codm_notifications for delete using (public.codm_is_clan_writer(clan_id) or auth.uid() = user_id);

-- Verifica dopo esecuzione:
-- select id, clan_id, title, starts_at, event_plan->>'teamBName' as avversario, local_id, sync_status from public.codm_events order by updated_at desc;
-- select c.id, c.name, c.tag, cm.user_id, cm.role from public.clans c left join public.clan_members cm on cm.clan_id = c.id where upper(coalesce(c.tag,'')) in ('AK47DX','AK') or upper(coalesce(c.name,''))='AK47DX';
