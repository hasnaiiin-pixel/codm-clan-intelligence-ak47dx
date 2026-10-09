-- AK47DX V14.1 FIX7 - SOLO LETTURA.
-- NON corregge e NON modifica dati, tabelle, permessi o trigger.
-- Avviare su Supabase SQL Editor solamente se il messaggio FIX7 indica
-- che il salvataggio CONTINUa a essere rifiutato.

-- 1. Verifica tipo dati e valore di default della modalita.
select column_name, data_type, udt_name, column_default, is_nullable
from information_schema.columns
where table_schema = 'public' and table_name = 'matches'
  and column_name in ('mode','record_quality','match_scope','season_id')
order by ordinal_position;

-- 2. Vincoli CHECK che potrebbero rifiutare CONTROL / CONTROLLO.
select c.conname as vincolo, pg_get_constraintdef(c.oid) as definizione
from pg_constraint c
where c.conrelid = 'public.matches'::regclass
  and c.contype = 'c'
order by c.conname;

-- 3. Trigger che si attivano al salvataggio matches.
select tgname as trigger_name, pg_get_triggerdef(oid) as definizione
from pg_trigger
where tgrelid = 'public.matches'::regclass
  and not tgisinternal
order by tgname;

-- 4. Codici presenti realmente nelle partite salvate.
select mode, count(*) as numero_partite
from public.matches
where upper(coalesce(mode,'')) in ('CONTROL','CONTROLLO')
group by mode
order by mode;

-- 5. Vincoli sulle statistiche che possono fallire dopo il match.
select c.conrelid::regclass as tabella, c.conname as vincolo, pg_get_constraintdef(c.oid) as definizione
from pg_constraint c
where c.conrelid in ('public.match_player_stats'::regclass, 'public.match_scoreboard_rows'::regclass)
  and c.contype = 'c'
order by c.conrelid::regclass::text, c.conname;
