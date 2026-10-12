-- AK47DX Clan Manager V14.2 FIX19 / FIX20 (solo database)
-- Correzione non distruttiva per PGRST204: score_limit mancante.
-- Eseguire nel SQL Editor del progetto Supabase collegato al sito.
-- Fare un backup prima di modifiche strutturali in produzione.
-- Non elimina o aggiorna tornei, incontri, punteggi o utenti.

BEGIN;

-- Campo usato dal generatore per i limiti di punteggio delle modalita.
ALTER TABLE public.codm_tournament_matches
  ADD COLUMN IF NOT EXISTS score_limit integer;

-- Campi facoltativi gia' previsti nel form incontri della V14.2.
-- Li rendiamo disponibili anche sui database creati con uno schema precedente.
ALTER TABLE public.codm_tournament_matches
  ADD COLUMN IF NOT EXISTS lobby_name text,
  ADD COLUMN IF NOT EXISTS referee text;

COMMIT;

-- Costringe PostgREST a ricaricare i metadati dello schema.
NOTIFY pgrst, 'reload schema';

-- VERIFICA: tutte e tre le colonne devono apparire (tipo: integer / text / text).
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'codm_tournament_matches'
  AND column_name IN ('score_limit', 'lobby_name', 'referee')
ORDER BY column_name;
