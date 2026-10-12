-- AK47DX V14.2 TEST: migrazione incrementale, NON DISTRUTTIVA.
-- Salvare prima un backup; eseguire SOLO dopo lettura sul progetto Supabase corretto.
-- Non cambia i risultati, gli account o la stagione attiva.
BEGIN;
ALTER TABLE public.codm_tournament_matches ADD COLUMN IF NOT EXISTS score_limit integer;
COMMENT ON COLUMN public.codm_tournament_matches.score_limit IS 'Punteggio limite configurabile per modalita e singolo match.';

-- Amplia SOLO il controllo della modalità, conservando integralmente il vincolo esistente.
-- Necessario per importazioni storiche con modalità sconosciuta (ALTRO).
DO $ak47dx$
DECLARE
  expression text;
  existing_columns smallint[];
  mode_column smallint;
BEGIN
 SELECT attnum INTO mode_column FROM pg_attribute WHERE attrelid='public.matches'::regclass AND attname='mode' AND NOT attisdropped;
 IF mode_column IS NULL THEN RAISE EXCEPTION 'Manca public.matches.mode: transazione annullata'; END IF;
 SELECT pg_get_expr(c.conbin,c.conrelid),c.conkey INTO expression,existing_columns
   FROM pg_constraint c WHERE c.conrelid='public.matches'::regclass AND c.conname='matches_mode_check' AND c.contype='c';
 IF expression IS NOT NULL THEN
   IF existing_columns IS DISTINCT FROM ARRAY[mode_column]::smallint[] THEN
     RAISE EXCEPTION 'matches_mode_check usa altre colonne: nessuna modifica eseguita';
   END IF;
   EXECUTE 'ALTER TABLE public.matches DROP CONSTRAINT matches_mode_check';
   EXECUTE format('ALTER TABLE public.matches ADD CONSTRAINT matches_mode_check CHECK ((%s) OR (mode IN (''ALTRO'',''CONTROL'',''CONTROLLO'')))',expression);
 END IF;
END $ak47dx$;
COMMIT;

-- Verifica senza scrivere righe:
SELECT column_name,data_type FROM information_schema.columns
 WHERE table_schema='public' AND table_name='codm_tournament_matches' AND column_name='score_limit';
SELECT conname,pg_get_constraintdef(oid) FROM pg_constraint
 WHERE conrelid='public.matches'::regclass AND conname='matches_mode_check';
