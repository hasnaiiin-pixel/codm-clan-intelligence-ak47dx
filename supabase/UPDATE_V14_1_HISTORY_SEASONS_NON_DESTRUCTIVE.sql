-- AK47DX V14.1 - MIGRAZIONE NON DISTRUTTIVA (dopo UPDATE_V14_SEASONS_OBJECTIVE_NON_DESTRUCTIVE.sql)
-- Non eseguire RESET o schema iniziale su dati di produzione.
begin;
alter table public.codm_seasons add column if not exists is_historical boolean not null default false;
alter table public.codm_seasons add column if not exists starts_on date;
alter table public.codm_seasons add column if not exists ends_on date;
alter table public.codm_seasons add column if not exists description text;
alter table public.matches add column if not exists record_quality text not null default 'complete';
alter table public.matches add column if not exists match_scope text not null default 'single';
alter table public.matches add column if not exists historical_source_key text;
create unique index if not exists idx_ak47dx_history_dedupe on public.matches(clan_id,historical_source_key) where historical_source_key is not null;
create index if not exists idx_ak47dx_history_scope on public.matches(match_scope,record_quality,season_id);
-- Funzioni di scrittura stagioni riservate al proprietario: RLS sulle tabelle resta in sola lettura.
create or replace function public.ak47dx_admin_create_season(p_name text,p_historical boolean default true,p_start date default null,p_end date default null,p_description text default null)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_id uuid;
begin
  if auth.uid() is null or lower(coalesce(auth.jwt()->>'email','')) <> 'hasnaiiin@gmail.com' then raise exception 'Permesso negato'; end if;
  if length(trim(coalesce(p_name,''))) < 2 or length(p_name)>100 then raise exception 'Nome stagione non valido'; end if;
  if p_start is not null and p_end is not null and p_end < p_start then raise exception 'Date non valide'; end if;
  insert into public.codm_seasons(name,is_active,is_historical,starts_on,ends_on,description)
  values (trim(p_name),false,p_historical,p_start,p_end,nullif(trim(coalesce(p_description,'')),'')) returning id into v_id;
  return v_id;
end $$;
create or replace function public.ak47dx_admin_activate_season(p_season_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null or lower(coalesce(auth.jwt()->>'email','')) <> 'hasnaiiin@gmail.com' then raise exception 'Permesso negato'; end if;
  if not exists(select 1 from public.codm_seasons where id=p_season_id and not is_historical) then raise exception 'Stagione assente o storica. Convertirla prima in attiva.'; end if;
  -- Indice parziale UNIQUE consente una sola stagione attiva.
  update public.codm_seasons set is_active=false where is_active;
  update public.codm_seasons set is_active=true where id=p_season_id;
end $$;
create or replace function public.ak47dx_admin_set_historical(p_season_id uuid,p_historical boolean)
returns void language plpgsql security definer set search_path = '' as $$
begin
 if auth.uid() is null or lower(coalesce(auth.jwt()->>'email','')) <> 'hasnaiiin@gmail.com' then raise exception 'Permesso negato'; end if;
 if exists(select 1 from public.codm_seasons where id=p_season_id and is_active) then raise exception 'Non modificare stagione attiva: attivarne prima un''altra'; end if;
 update public.codm_seasons set is_historical=p_historical where id=p_season_id;
end $$;
revoke all on function public.ak47dx_admin_create_season(text,boolean,date,date,text) from public;
revoke all on function public.ak47dx_admin_activate_season(uuid) from public;
revoke all on function public.ak47dx_admin_set_historical(uuid,boolean) from public;
grant execute on function public.ak47dx_admin_create_season(text,boolean,date,date,text) to authenticated;
grant execute on function public.ak47dx_admin_activate_season(uuid) to authenticated;
grant execute on function public.ak47dx_admin_set_historical(uuid,boolean) to authenticated;
-- Informazioni opzionali sugli incontri: preserva le colonne già esistenti.
alter table public.codm_tournament_matches add column if not exists lobby_name text;
alter table public.codm_tournament_matches add column if not exists referee text;
commit;
