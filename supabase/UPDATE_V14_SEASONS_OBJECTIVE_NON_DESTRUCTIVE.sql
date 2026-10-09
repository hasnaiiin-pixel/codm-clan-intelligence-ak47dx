-- AK47DX V14: migrazione incrementale NON DISTRUTTIVA.
-- Eseguire UNA VOLTA dal SQL Editor di Supabase dopo backup verificato.
create table if not exists public.codm_seasons (
 id uuid primary key default gen_random_uuid(),
 name text not null unique,
 is_active boolean not null default false,
 created_at timestamptz not null default now()
);
create unique index if not exists codm_one_active_season on public.codm_seasons ((is_active)) where is_active;
alter table public.codm_seasons enable row level security;
drop policy if exists codm_seasons_read on public.codm_seasons;
create policy codm_seasons_read on public.codm_seasons for select to anon, authenticated using (true);
-- I cambi di stagione vengono gestiti dall'amministratore nel SQL Editor per sicurezza.
insert into public.codm_seasons(name,is_active) values ('Stagione 1',false) on conflict (name) do nothing;
insert into public.codm_seasons(name,is_active) values ('Stagione 2',false) on conflict (name) do nothing;
alter table public.matches add column if not exists season_id uuid references public.codm_seasons(id);
-- I record precedenti, senza season_id, diventano Stagione 1; mai sovrascrivere assegnazioni esistenti.
update public.matches set season_id=(select id from public.codm_seasons where name='Stagione 1') where season_id is null;
-- Abilitare Stagione 2 per nuove partite. Le altre stagioni vengono disattivate.
update public.codm_seasons set is_active=false where is_active;
update public.codm_seasons set is_active=true where name='Stagione 2';
create or replace function public.ak47dx_assign_active_season() returns trigger language plpgsql as $$
begin
 if new.season_id is null then select id into new.season_id from public.codm_seasons where is_active limit 1; end if;
 return new;
end $$;
drop trigger if exists ak47dx_matches_active_season on public.matches;
create trigger ak47dx_matches_active_season before insert on public.matches for each row execute function public.ak47dx_assign_active_season();
create index if not exists idx_matches_season_id on public.matches(season_id);
-- Conserva il dato non disponibile come NULL, non zero.
alter table public.match_scoreboard_rows add column if not exists objective_time_seconds integer;
alter table public.match_scoreboard_rows add column if not exists objective_time_text text;
alter table public.match_player_stats add column if not exists objective_time_seconds integer;
alter table public.match_player_stats add column if not exists objective_time_text text;
-- Non alterare i valori storici presenti senza una verifica dei dati.
