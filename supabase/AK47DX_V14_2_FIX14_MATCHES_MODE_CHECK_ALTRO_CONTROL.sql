-- AK47DX CLAN MANAGER V14.2 - FIX14
-- Corregge PostgreSQL 23514 / matches_mode_check per importazione risultati storici.
-- Consente ALTRO (modalita' predefinita dello storico), CONTROL e CONTROLLO.
-- Preserva TUTTE le regole/valori accettati dal vincolo esistente.
-- Non modifica partite, giocatori, stagioni, tornei o statistiche gia' salvati.
-- Eseguire in Supabase > SQL Editor sul PROGETTO CORRETTO, dopo backup recente.
-- NON eseguire FINAL_SCHEMA o script di reset.

BEGIN;

DO $ak47dx_fix14$
DECLARE
  v_table regclass;
  v_mode_attnum smallint;
  v_old_expr text;
  v_old_conkey smallint[];
BEGIN
  v_table := to_regclass('public.matches');
  IF v_table IS NULL THEN
    RAISE EXCEPTION 'FIX14 annullata: public.matches non esiste nel progetto selezionato.';
  END IF;

  SELECT attnum INTO v_mode_attnum
    FROM pg_attribute
   WHERE attrelid = v_table AND attname = 'mode' AND NOT attisdropped;
  IF v_mode_attnum IS NULL THEN
    RAISE EXCEPTION 'FIX14 annullata: public.matches.mode non esiste.';
  END IF;

  SELECT pg_get_expr(c.conbin, c.conrelid), c.conkey
    INTO v_old_expr, v_old_conkey
    FROM pg_constraint AS c
   WHERE c.conrelid = v_table
     AND c.conname = 'matches_mode_check'
     AND c.contype = 'c';

  IF v_old_expr IS NULL THEN
    RAISE EXCEPTION 'FIX14 annullata: matches_mode_check non trovato. Verificare lo schema prima di agire.';
  END IF;

  -- Non alterare un CHECK che controlla anche colonne diverse da mode.
  IF v_old_conkey IS DISTINCT FROM ARRAY[v_mode_attnum]::smallint[] THEN
    RAISE EXCEPTION 'FIX14 annullata: matches_mode_check non riguarda soltanto mode. Definizione: %', v_old_expr;
  END IF;

  -- Riprende ESATTAMENTE l'espressione precedente e aggiunge solo tre valori.
  -- L'operazione e' atomica; in caso di errore viene ripristinato il vecchio CHECK.
  EXECUTE 'ALTER TABLE public.matches DROP CONSTRAINT matches_mode_check';
  EXECUTE format(
    'ALTER TABLE public.matches ADD CONSTRAINT matches_mode_check CHECK ((%s) OR (mode IN (%L, %L, %L)))',
    v_old_expr, 'ALTRO', 'CONTROL', 'CONTROLLO'
  );

  RAISE NOTICE 'FIX14 eseguita: ALTRO / CONTROL / CONTROLLO ammessi; vincolo precedente conservato.';
END;
$ak47dx_fix14$;

COMMIT;

-- La REST API di Supabase puo' aggiornare la cache dello schema.
NOTIFY pgrst, 'reload schema';

-- CONTROLLO FINALE: il testo del vincolo deve contenere ALTRO, CONTROL, CONTROLLO
-- oltre alle precedenti modalita' (CED, POSTAZIONE, DOMINIO, ecc.).
SELECT conname AS vincolo,
       pg_get_constraintdef(oid) AS definizione
  FROM pg_constraint
 WHERE conrelid = 'public.matches'::regclass
   AND conname = 'matches_mode_check';
