-- AK47DX V14.2 FIX13 — Errore PGRST204: matches.created_by
-- Script incrementale NON distruttivo per Supabase SQL Editor.
-- Mantiene intatte partite, statistiche, stagioni, utenti e risultati.
-- Il file app/api/history-results/route.ts invia created_by durante l'import storico.
-- Lo schema completo atteso definisce created_by come UUID riferito ad auth.users(id).
-- Eseguire nel database corretto dopo un backup.

BEGIN;

DO $ak47dx$
DECLARE
  actual_type text;
BEGIN
  IF to_regclass('public.matches') IS NULL THEN
    RAISE EXCEPTION 'Tabella public.matches non trovata. Operazione annullata.';
  END IF;
  SELECT data_type INTO actual_type
  FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = 'matches' AND column_name = 'created_by';
  IF actual_type IS NOT NULL AND actual_type <> 'uuid' THEN
    RAISE EXCEPTION 'public.matches.created_by esiste ma ha tipo %, non UUID. Nessuna modifica applicata.', actual_type;
  END IF;
END
$ak47dx$;

ALTER TABLE public.matches
  ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;

COMMIT;

-- Forza l'aggiornamento della cache API PostgREST (per il caso colonna gia' presente).
NOTIFY pgrst, 'reload schema';

-- 1) Verifica created_by (deve restituire una riga con data_type = uuid).
SELECT table_schema, table_name, column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'matches' AND column_name = 'created_by';

-- 2) Verifica di compatibilita' dell'import storico.
-- Le righe con stato 'MANCANTE' richiedono l'applicazione delle migrazioni precedenti,
-- non vanno aggiunte automaticamente senza verificare lo schema attuale.
WITH expected(column_name) AS (
  VALUES ('clan_id'), ('season_id'), ('match_date'), ('match_type'),
         ('mode'), ('map_name'), ('opponent'), ('result'),
         ('team_score'), ('enemy_score'), ('notes'), ('screenshot_url'),
         ('record_quality'), ('match_scope'), ('historical_source_key'), ('created_by')
)
SELECT e.column_name,
       CASE WHEN c.column_name IS NULL THEN 'MANCANTE' ELSE 'OK' END AS stato,
       c.data_type
FROM expected e
LEFT JOIN information_schema.columns c
  ON c.table_schema = 'public' AND c.table_name = 'matches'
 AND c.column_name = e.column_name
ORDER BY e.column_name;
