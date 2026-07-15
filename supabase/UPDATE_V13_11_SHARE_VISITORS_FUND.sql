-- =========================================================
-- CLAN MANAGER AK47DX V13.11
-- Condivisione statistiche (nessuna tabella richiesta), analytics visitatori
-- e Fondo estrazioni con turnazione completa.
-- Eseguire UNA VOLTA nel Supabase SQL Editor.
-- Non cancella dati esistenti e non modifica auth.users.
-- =========================================================

begin;

create extension if not exists pgcrypto;

-- Verifica centralizzata dei permessi amministratore.
create or replace function public.codm_can_view_admin_data()
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select
    exists (
      select 1
      from public.clan_members cm
      where cm.user_id = auth.uid()
        and (
          cm.role in ('owner', 'coach')
          or coalesce((cm.permissions ->> 'view_admin_panel')::boolean, false)
          or coalesce((cm.permissions ->> 'manage_users')::boolean, false)
        )
    )
    or exists (
      select 1
      from auth.users u
      where u.id = auth.uid()
        and lower(coalesce(u.email, '')) = 'hasnaiiin@gmail.com'
    );
$$;

revoke all on function public.codm_can_view_admin_data() from public;
grant execute on function public.codm_can_view_admin_data() to authenticated;

-- =========================================================
-- VISITATORI / VISUALIZZAZIONI
-- Non vengono memorizzati indirizzo IP o posizione precisa.
-- =========================================================
create table if not exists public.site_page_views (
  id uuid primary key default gen_random_uuid(),
  visitor_id text not null,
  user_id uuid references auth.users(id) on delete set null,
  path text not null,
  referrer text,
  device_type text,
  is_pwa boolean not null default false,
  user_agent text,
  created_at timestamptz not null default now()
);

create index if not exists idx_site_page_views_created_at on public.site_page_views(created_at desc);
create index if not exists idx_site_page_views_visitor on public.site_page_views(visitor_id, created_at desc);
create index if not exists idx_site_page_views_path on public.site_page_views(path, created_at desc);

alter table public.site_page_views enable row level security;

drop policy if exists site_page_views_insert_public on public.site_page_views;
create policy site_page_views_insert_public
on public.site_page_views
for insert
to anon, authenticated
with check (
  length(visitor_id) between 8 and 120
  and length(path) between 1 and 500
);

drop policy if exists site_page_views_admin_read on public.site_page_views;
create policy site_page_views_admin_read
on public.site_page_views
for select
to authenticated
using (public.codm_can_view_admin_data());

drop policy if exists site_page_views_admin_delete on public.site_page_views;
create policy site_page_views_admin_delete
on public.site_page_views
for delete
to authenticated
using (public.codm_can_view_admin_data());

grant insert on public.site_page_views to anon, authenticated;
grant select, delete on public.site_page_views to authenticated;

-- =========================================================
-- FONDO ESTRAZIONI
-- Registro gestionale: l'app NON incassa o trasferisce denaro.
-- =========================================================
create table if not exists public.codm_fund_cycles (
  id uuid primary key default gen_random_uuid(),
  clan_id uuid not null references public.clans(id) on delete cascade,
  title text not null,
  monthly_amount numeric(10,2) not null check (monthly_amount > 0),
  currency text not null default 'EUR',
  status text not null default 'active' check (status in ('active','completed','archived')),
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  notes text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists ux_codm_fund_one_active_cycle
on public.codm_fund_cycles(clan_id)
where status = 'active';

create table if not exists public.codm_fund_participants (
  id uuid primary key default gen_random_uuid(),
  cycle_id uuid not null references public.codm_fund_cycles(id) on delete cascade,
  player_id uuid not null references public.players(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  preferred_weapon text,
  preferred_rarity text not null default 'Indifferente' check (preferred_rarity in ('Leggendaria','Mitica','Indifferente')),
  active boolean not null default true,
  selected_at timestamptz,
  selected_draw_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(cycle_id, player_id)
);

create table if not exists public.codm_fund_contributions (
  id uuid primary key default gen_random_uuid(),
  cycle_id uuid not null references public.codm_fund_cycles(id) on delete cascade,
  participant_id uuid not null references public.codm_fund_participants(id) on delete cascade,
  contribution_month date not null,
  amount numeric(10,2) not null check (amount >= 0),
  status text not null default 'pending' check (status in ('pending','paid','exempt')),
  paid_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(cycle_id, participant_id, contribution_month)
);

create table if not exists public.codm_fund_draws (
  id uuid primary key default gen_random_uuid(),
  cycle_id uuid not null references public.codm_fund_cycles(id) on delete cascade,
  draw_month date not null,
  winner_participant_id uuid not null references public.codm_fund_participants(id) on delete restrict,
  prize_type text not null check (prize_type in ('Leggendaria','Mitica')),
  preferred_weapon_snapshot text,
  winner_name_snapshot text not null,
  eligible_count integer not null default 0 check (eligible_count >= 1),
  eligible_snapshot jsonb not null default '[]'::jsonb,
  random_proof text not null,
  drawn_by uuid references auth.users(id) on delete set null,
  drawn_at timestamptz not null default now(),
  notes text,
  unique(cycle_id, draw_month)
);

alter table public.codm_fund_participants
  drop constraint if exists codm_fund_participants_selected_draw_id_fkey;
alter table public.codm_fund_participants
  add constraint codm_fund_participants_selected_draw_id_fkey
  foreign key (selected_draw_id) references public.codm_fund_draws(id) on delete set null;

create index if not exists idx_codm_fund_cycles_clan_status on public.codm_fund_cycles(clan_id, status, created_at desc);
create index if not exists idx_codm_fund_participants_cycle on public.codm_fund_participants(cycle_id, active, selected_at);
create index if not exists idx_codm_fund_contributions_month on public.codm_fund_contributions(cycle_id, contribution_month, status);
create index if not exists idx_codm_fund_draws_cycle on public.codm_fund_draws(cycle_id, drawn_at desc);

alter table public.codm_fund_cycles enable row level security;
alter table public.codm_fund_participants enable row level security;
alter table public.codm_fund_contributions enable row level security;
alter table public.codm_fund_draws enable row level security;

-- Lettura consentita agli utenti registrati del clan.
do $$
declare table_name text;
begin
  foreach table_name in array array['codm_fund_cycles','codm_fund_participants','codm_fund_contributions','codm_fund_draws'] loop
    execute format('drop policy if exists %I on public.%I', table_name || '_read_auth', table_name);
    execute format('create policy %I on public.%I for select to authenticated using (true)', table_name || '_read_auth', table_name);
  end loop;
end $$;

-- Cicli, quote ed estrazioni: gestione solo Owner/Admin autorizzati.
drop policy if exists codm_fund_cycles_admin_all on public.codm_fund_cycles;
create policy codm_fund_cycles_admin_all on public.codm_fund_cycles
for all to authenticated
using (public.codm_can_view_admin_data())
with check (public.codm_can_view_admin_data());

drop policy if exists codm_fund_contributions_admin_all on public.codm_fund_contributions;
create policy codm_fund_contributions_admin_all on public.codm_fund_contributions
for all to authenticated
using (public.codm_can_view_admin_data())
with check (public.codm_can_view_admin_data());

drop policy if exists codm_fund_draws_admin_all on public.codm_fund_draws;
create policy codm_fund_draws_admin_all on public.codm_fund_draws
for all to authenticated
using (public.codm_can_view_admin_data())
with check (public.codm_can_view_admin_data());

-- Partecipanti: l'admin gestisce tutti; ogni utente può inserire/aggiornare il proprio record.
drop policy if exists codm_fund_participants_insert on public.codm_fund_participants;
create policy codm_fund_participants_insert on public.codm_fund_participants
for insert to authenticated
with check (public.codm_can_view_admin_data() or user_id = auth.uid());

drop policy if exists codm_fund_participants_update on public.codm_fund_participants;
create policy codm_fund_participants_update on public.codm_fund_participants
for update to authenticated
using (public.codm_can_view_admin_data() or user_id = auth.uid())
with check (public.codm_can_view_admin_data() or user_id = auth.uid());

drop policy if exists codm_fund_participants_delete on public.codm_fund_participants;
create policy codm_fund_participants_delete on public.codm_fund_participants
for delete to authenticated
using (public.codm_can_view_admin_data());

grant select, insert, update, delete on public.codm_fund_cycles to authenticated;
grant select, insert, update, delete on public.codm_fund_participants to authenticated;
grant select, insert, update, delete on public.codm_fund_contributions to authenticated;
grant select, insert, update, delete on public.codm_fund_draws to authenticated;

commit;
