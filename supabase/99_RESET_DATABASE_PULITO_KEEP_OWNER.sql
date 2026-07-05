-- CODM AK47DX - RESET DATI TEST / PARTENZA DATABASE PULITO
-- Versione: V5.5
--
-- Questo script NON modifica codice, policy o struttura app.
-- Cancella solo dati operativi/test e lascia un solo utente principale.
--
-- PRIMA DI ESEGUIRE:
--   Sostituisci INSERISCI_EMAIL_OWNER con la tua email principale.

DO $$
DECLARE
  keep_email text := 'INSERISCI_EMAIL_OWNER';
  keep_user_id uuid;
  keep_clan_id uuid;
  t text;
BEGIN
  SELECT id INTO keep_user_id
  FROM auth.users
  WHERE lower(email) = lower(keep_email)
  LIMIT 1;

  IF keep_user_id IS NULL THEN
    RAISE EXCEPTION 'Utente principale non trovato con email: %', keep_email;
  END IF;

  -- Mantieni clan esistente, oppure creane uno pulito se non esiste.
  IF to_regclass('public.clans') IS NOT NULL THEN
    SELECT id INTO keep_clan_id
    FROM public.clans
    ORDER BY created_at ASC NULLS LAST
    LIMIT 1;

    IF keep_clan_id IS NULL THEN
      INSERT INTO public.clans (name, tag, owner_user_id)
      VALUES ('AK47DX', 'AK47DX', keep_user_id)
      RETURNING id INTO keep_clan_id;
    ELSE
      UPDATE public.clans SET owner_user_id = keep_user_id WHERE id = keep_clan_id;
    END IF;
  END IF;

  -- Ordine pensato per evitare problemi FK.
  FOREACH t IN ARRAY ARRAY[
    'public.match_player_stats',
    'public.match_scoreboard_rows',
    'public.match_loadouts',
    'public.screenshot_imports',
    'public.matches',
    'public.codm_event_players',
    'public.codm_events',
    'public.codm_notifications',
    'public.player_snapshots',
    'public.player_aliases',
    'public.players',
    'public.loadouts',
    'public.weapon_builds',
    'public.clan_invite_requests',
    'public.clan_invites',
    'public.codm_player_join_requests',
    'public.ocr_training_samples',
    'public.yolo_dataset_exports'
  ] LOOP
    IF to_regclass(t) IS NOT NULL THEN
      EXECUTE 'DELETE FROM ' || t;
    END IF;
  END LOOP;

  -- Preferenze notifiche: resta solo owner.
  IF to_regclass('public.codm_notification_preferences') IS NOT NULL THEN
    EXECUTE 'DELETE FROM public.codm_notification_preferences WHERE user_id <> $1' USING keep_user_id;
  END IF;

  -- Membership/profili: resta solo owner.
  IF to_regclass('public.clan_members') IS NOT NULL THEN
    EXECUTE 'DELETE FROM public.clan_members WHERE user_id <> $1' USING keep_user_id;
  END IF;

  IF to_regclass('public.profiles') IS NOT NULL THEN
    EXECUTE 'DELETE FROM public.profiles WHERE id <> $1' USING keep_user_id;
  END IF;

  -- Ricrea/aggiorna profilo owner.
  IF to_regclass('public.profiles') IS NOT NULL THEN
    INSERT INTO public.profiles (id, email, display_name, player_nickname, updated_at)
    SELECT keep_user_id, u.email, coalesce(split_part(u.email, '@', 1), 'Owner'), coalesce(split_part(u.email, '@', 1), 'Owner'), now()
    FROM auth.users u
    WHERE u.id = keep_user_id
    ON CONFLICT (id) DO UPDATE SET
      email = EXCLUDED.email,
      updated_at = now();
  END IF;

  -- Rimetti l'owner come owner del clan.
  IF to_regclass('public.clan_members') IS NOT NULL AND keep_clan_id IS NOT NULL THEN
    INSERT INTO public.clan_members (clan_id, user_id, role)
    VALUES (keep_clan_id, keep_user_id, 'owner')
    ON CONFLICT (clan_id, user_id) DO UPDATE SET role = 'owner';
  END IF;

  IF to_regclass('public.codm_notification_preferences') IS NOT NULL THEN
    INSERT INTO public.codm_notification_preferences (user_id)
    VALUES (keep_user_id)
    ON CONFLICT (user_id) DO NOTHING;
  END IF;

  -- Rende reale la richiesta "solo utente principale deve rimanere".
  -- Se preferisci mantenere account auth ma pulire solo dati app, commenta la riga sotto.
  DELETE FROM auth.users WHERE id <> keep_user_id;

  RAISE NOTICE 'Reset completato. Utente mantenuto: %, clan mantenuto: %', keep_email, keep_clan_id;
END $$;
