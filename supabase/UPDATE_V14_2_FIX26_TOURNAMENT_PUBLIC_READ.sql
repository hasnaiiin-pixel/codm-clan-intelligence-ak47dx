-- AK47DX V14.2 FIX26 - TORNEI PUBBLICI, SOLA LETTURA.
-- Applicare dopo FIX24 e FIX25. Nessun DROP di tabelle o dati.
-- Non espone email, cognomi, nomi anagrafici, UID, note, iscrizioni o richieste privacy.
-- Le funzioni SECURITY DEFINER sono ristrette a campi specifici: verificare
-- che il proprietario SQL abbia privilegi appropriati e non aggiungere SELECT *.

create or replace function public.codm_fix26_public_tournaments()
returns jsonb
language sql stable security definer set search_path = public, pg_temp
as $$
 select coalesce(jsonb_agg(jsonb_build_object(
   'id',t.id,'name',t.name,'status',t.status,'format',t.format,'type',t.type,
   'tournament_date',t.tournament_date,'cover_url',t.cover_url
 ) order by t.created_at desc),'[]'::jsonb)
 from public.codm_tournaments t
 where t.status is distinct from 'Bozza';
$$;

create or replace function public.codm_fix26_public_tournament(p_tournament_id uuid)
returns jsonb
language sql stable security definer set search_path = public, pg_temp
as $$
 select jsonb_build_object(
   'tournament',jsonb_build_object(
      'id',t.id,'name',t.name,'description',t.description,
      'status',t.status,'format',t.format,'type',t.type,
      'tournament_date',t.tournament_date,'winner',t.winner
   ),
   'teams',(select coalesce(jsonb_agg(jsonb_build_object(
     'id',x.id,'name',x.name,'players',coalesce(to_jsonb(x.players),'[]'::jsonb),
     'reserves',coalesce(to_jsonb(x.reserves),'[]'::jsonb),'status',x.status
   ) order by x.name),'[]'::jsonb) from public.codm_tournament_teams x where x.tournament_id=t.id),
   'matches',(select coalesce(jsonb_agg(jsonb_build_object(
     'id',m.id,'phase',m.phase,'group_name',m.group_name,
     'team_a',m.team_a,'team_b',m.team_b,'match_time',m.match_time,
     'mode',m.mode,'map_name',m.map_name,'score_a',m.score_a,'score_b',m.score_b,
     'score_limit',m.score_limit,'lobby_name',m.lobby_name,'status',m.status,'winner',m.winner
   ) order by m.match_time nulls last),'[]'::jsonb) from public.codm_tournament_matches m where m.tournament_id=t.id),
   'bracket',case when jsonb_typeof(t.rules::jsonb->'advanced_bracket_v2')='object'
     then (t.rules::jsonb->'advanced_bracket_v2') - 'revision'
     else null end
 )
 from public.codm_tournaments t
 where t.id=p_tournament_id and t.status is distinct from 'Bozza';
$$;

revoke all on function public.codm_fix26_public_tournaments() from public;
revoke all on function public.codm_fix26_public_tournament(uuid) from public;
grant execute on function public.codm_fix26_public_tournaments() to anon, authenticated;
grant execute on function public.codm_fix26_public_tournament(uuid) to anon, authenticated;
notify pgrst, 'reload schema';

select 'funzione elenco pubblico' as controllo,
  to_regprocedure('public.codm_fix26_public_tournaments()') is not null as ok
union all
select 'funzione dettaglio pubblico',
  to_regprocedure('public.codm_fix26_public_tournament(uuid)') is not null;
