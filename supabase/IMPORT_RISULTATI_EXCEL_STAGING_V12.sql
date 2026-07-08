-- =========================================================
-- CLAN MANAGER V12 - IMPORT RISULTATI DA EXCEL / SQL STAGING
-- Uso:
-- 1) Crea questa tabella/funzione in Supabase SQL Editor.
-- 2) Esporta il foglio IMPORT_PARTITE in CSV oppure genera INSERT SQL da ChatGPT.
-- 3) Carica le righe in public.codm_import_result_rows.
-- 4) Esegui: select public.codm_process_import_batch('BATCH_ID_TESTO');
-- =========================================================

begin;

create extension if not exists pgcrypto;

create table if not exists public.codm_import_result_rows (
  id uuid primary key default gen_random_uuid(),
  import_batch_id text not null default 'manual',
  source_match_code text not null,
  partita integer,
  data_partita date,
  ora_partita time,
  tipo_partita text default 'scrim',
  modalita_codm text default 'CED',
  mappa_codm text,
  team_nostro text default 'BLU',
  team_blu text,
  team_rosso text,
  risultato_blu integer,
  risultato_rosso integer,
  risultato_nostro integer,
  risultato_avversario integer,
  esito_nostro text,
  giocatore text,
  team_giocatore text default 'NOSTRO',
  kill integer default 0,
  death integer default 0,
  assist integer default 0,
  mvp boolean default false,
  foto_file text,
  foto_url text,
  note text,
  processed_at timestamptz,
  created_match_id uuid references public.matches(id) on delete set null,
  created_at timestamptz default now()
);

create index if not exists idx_codm_import_result_rows_batch on public.codm_import_result_rows(import_batch_id, source_match_code);

alter table public.codm_import_result_rows enable row level security;
drop policy if exists codm_import_result_rows_read_auth on public.codm_import_result_rows;
create policy codm_import_result_rows_read_auth on public.codm_import_result_rows for select to authenticated using (true);
drop policy if exists codm_import_result_rows_write_auth on public.codm_import_result_rows;
create policy codm_import_result_rows_write_auth on public.codm_import_result_rows for all to authenticated using (true) with check (true);

create or replace function public.codm_process_import_batch(p_import_batch_id text, p_clan_id uuid default null)
returns table(source_match_code text, match_id uuid, players_saved integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_clan uuid;
  m record;
  r record;
  v_match uuid;
  v_player uuid;
  v_team_score integer;
  v_enemy_score integer;
  v_result text;
  v_winning_team text;
  v_players integer;
begin
  select coalesce(p_clan_id, (select id from public.clans where upper(tag)='AK47DX' or upper(name)='AK47DX' order by created_at asc limit 1)) into v_clan;
  if v_clan is null then
    raise exception 'Clan AK47DX non trovato. Esegui FINAL_SCHEMA_CLAN_MANAGER.sql prima.';
  end if;

  for m in
    select source_match_code,
           min(data_partita) as data_partita,
           min(ora_partita) as ora_partita,
           max(tipo_partita) as tipo_partita,
           max(modalita_codm) as modalita_codm,
           max(mappa_codm) as mappa_codm,
           max(team_nostro) as team_nostro,
           max(team_blu) as team_blu,
           max(team_rosso) as team_rosso,
           max(risultato_blu) as risultato_blu,
           max(risultato_rosso) as risultato_rosso,
           max(foto_file) as foto_file,
           max(foto_url) as foto_url,
           string_agg(distinct nullif(note,''), E'\n') as note
    from public.codm_import_result_rows
    where import_batch_id = p_import_batch_id and processed_at is null
    group by source_match_code
    order by min(data_partita), min(ora_partita), source_match_code
  loop
    if upper(coalesce(m.team_nostro,'BLU')) in ('ROSSO','RED') then
      v_team_score := coalesce(m.risultato_rosso, 0);
      v_enemy_score := coalesce(m.risultato_blu, 0);
    else
      v_team_score := coalesce(m.risultato_blu, 0);
      v_enemy_score := coalesce(m.risultato_rosso, 0);
    end if;
    v_result := case when v_team_score > v_enemy_score then 'WIN' when v_team_score < v_enemy_score then 'LOSE' else 'DRAW' end;
    v_winning_team := case when coalesce(m.risultato_blu,0) > coalesce(m.risultato_rosso,0) then 'blue' when coalesce(m.risultato_blu,0) < coalesce(m.risultato_rosso,0) then 'red' else 'draw' end;

    insert into public.matches(
      clan_id, match_date, match_type, mode, map_name, opponent, result,
      team_score, enemy_score, screenshot_url, winning_team, our_team, match_notes, notes
    ) values (
      v_clan,
      (coalesce(m.data_partita, current_date)::text || ' ' || coalesce(m.ora_partita, current_time)::text)::timestamptz,
      coalesce(m.tipo_partita,'scrim'), coalesce(m.modalita_codm,'CED'), m.mappa_codm,
      case when upper(coalesce(m.team_nostro,'BLU')) in ('ROSSO','RED') then m.team_blu else m.team_rosso end,
      v_result, v_team_score, v_enemy_score, nullif(m.foto_url,''),
      v_winning_team,
      case when upper(coalesce(m.team_nostro,'BLU')) in ('ROSSO','RED') then 'red' else 'blue' end,
      concat_ws(E'\n', m.note, 'Excel import batch='||p_import_batch_id, 'ID_PARTITA='||m.source_match_code, 'FOTO_FILE='||coalesce(m.foto_file,'')),
      concat('IMPORT_EXCEL; batch=',p_import_batch_id,'; ID_PARTITA=',m.source_match_code,'; FOTO_FILE=',coalesce(m.foto_file,''))
    ) returning id into v_match;

    v_players := 0;
    for r in
      select * from public.codm_import_result_rows
      where import_batch_id = p_import_batch_id and source_match_code = m.source_match_code and processed_at is null
      order by id
    loop
      if coalesce(nullif(trim(r.giocatore),''),'') = '' then
        continue;
      end if;
      if upper(coalesce(r.team_giocatore,'NOSTRO')) like 'AVVERS%' then
        continue;
      end if;

      select id into v_player from public.players where clan_id = v_clan and lower(nickname)=lower(r.giocatore) limit 1;
      if v_player is null then
        insert into public.players(clan_id, nickname, clan_name, status, role)
        values (v_clan, r.giocatore, 'AK47DX', 'active', 'player') returning id into v_player;
      end if;

      insert into public.match_player_stats(match_id, player_id, kills, deaths, assists, score, rating, mvp, team_side)
      values (v_match, v_player, coalesce(r.kill,0), coalesce(r.death,0), coalesce(r.assist,0), 0,
              round((coalesce(r.kill,0) * 1.0 + coalesce(r.assist,0) * 0.35 - coalesce(r.death,0) * 0.45 + case when coalesce(r.mvp,false) then 2 else 0 end)::numeric, 2),
              coalesce(r.mvp,false), 'ALLY');

      insert into public.match_scoreboard_rows(match_id, player_id, team_side, team_rank, nickname_raw, nickname_resolved, kills, deaths, assists, score, mvp_type, read_status)
      values (v_match, v_player, 'ALLY', v_players + 1, r.giocatore, r.giocatore, coalesce(r.kill,0), coalesce(r.death,0), coalesce(r.assist,0), 0,
              case when coalesce(r.mvp,false) then 'MVP' else null end, 'excel_sql');
      v_players := v_players + 1;
    end loop;

    update public.codm_import_result_rows set processed_at = now(), created_match_id = v_match
    where import_batch_id = p_import_batch_id and source_match_code = m.source_match_code and processed_at is null;

    source_match_code := m.source_match_code;
    match_id := v_match;
    players_saved := v_players;
    return next;
  end loop;
end;
$$;

commit;
