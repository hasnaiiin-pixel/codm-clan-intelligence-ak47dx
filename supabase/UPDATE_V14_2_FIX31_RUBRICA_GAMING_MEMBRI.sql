-- AK47DX FIX31 ADD-ON: rubrica gaming, accesso minimo membri, organigramma, screenshot batch.
-- Applicare DOPO FIX30, nel progetto Supabase corretto. Non modifica tornei o contatti già importati.
-- NON contiene telefoni, UID individuali o nomi personali.
BEGIN;

-- Owner mantiene privilegi completi; i membri devono essere registrati e autorizzati individualmente.
-- Ruoli di Rubrica/Clan: il campo clan_role resta testuale e indipendente dai ruoli login.
CREATE OR REPLACE FUNCTION public.ak_rubrica_my_permissions()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_flags jsonb := '{}'::jsonb; v_owner boolean;
BEGIN
  v_owner := EXISTS(SELECT 1 FROM public.clan_members m WHERE m.user_id=auth.uid() AND m.role='owner' AND m.status='active'
    AND m.clan_id=(SELECT c.id FROM public.clans c ORDER BY c.created_at ASC LIMIT 1));
  IF v_owner THEN
    RETURN '{"view_contacts":true,"view_private_details":true,"edit_contacts":true,"change_nickname":true,"view_phone":true,"view_social":true,"view_notes":true,"archive_contacts":true,"manage_access":true}'::jsonb;
  END IF;
  SELECT a.flags INTO v_flags FROM public.ak_rubrica_access a WHERE a.user_id=auth.uid();
  RETURN COALESCE(v_flags,'{}'::jsonb);
END; $$;

-- IMPORTANTISSIMO: chi ha solo view_contacts riceve soltanto nome in gioco, UID e ruolo/stato.
-- Non basta nascondere campi nella UI: la redazione è effettuata PRIMA della risposta RPC.
CREATE OR REPLACE FUNCTION public.ak_rubrica_redact(p_row public.ak_rubrica_contacts)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
DECLARE v jsonb;
BEGIN
  IF NOT public.ak_rubrica_allowed('view_contacts') THEN RAISE EXCEPTION 'Accesso rubrica negato' USING ERRCODE='42501'; END IF;
  IF NOT public.ak_rubrica_allowed('view_private_details') THEN
    RETURN jsonb_build_object('id',p_row.id,'nickname',p_row.nickname,'uid',p_row.uid,
      'clan_role',p_row.clan_role,'clan_status',p_row.clan_status);
  END IF;
  v := to_jsonb(p_row) - 'created_by' - 'updated_by';
  IF NOT public.ak_rubrica_allowed('view_phone') THEN
    v := v - 'phone' - 'phone_alt' - 'whatsapp_name' - 'share_phone';
  END IF;
  IF NOT public.ak_rubrica_allowed('view_social') THEN
    v := v - 'tiktok' - 'instagram' - 'facebook' - 'youtube' - 'telegram' - 'discord' - 'personal_photo_url';
  END IF;
  IF NOT public.ak_rubrica_allowed('view_notes') THEN v := v - 'notes'; END IF;
  RETURN v;
END; $$;

-- Il membro base vede soltanto i giocatori ATTIVI, niente elenco ex membri.
-- Limitiamo anche la ricerca ai campi che un membro è autorizzato a leggere;
-- ricercare per nome reale non deve rivelare correlazioni private.
CREATE OR REPLACE FUNCTION public.ak_rubrica_list(p_search text DEFAULT '')
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_result jsonb; v_details boolean;
BEGIN
  IF NOT public.ak_rubrica_allowed('view_contacts') THEN RAISE EXCEPTION 'Accesso rubrica negato' USING ERRCODE='42501'; END IF;
  v_details := public.ak_rubrica_allowed('view_private_details');
  SELECT COALESCE(jsonb_agg(public.ak_rubrica_redact(c) ORDER BY lower(c.nickname)), '[]'::jsonb)
  INTO v_result FROM public.ak_rubrica_contacts c
  WHERE c.archived=false
    AND (v_details OR c.clan_status='Attivo')
    AND (COALESCE(btrim(p_search),'')='' OR c.nickname ILIKE '%'||btrim(p_search)||'%'
      OR c.uid ILIKE '%'||btrim(p_search)||'%'
      OR (v_details AND (
        c.given_name ILIKE '%'||btrim(p_search)||'%' OR
        c.surname ILIKE '%'||btrim(p_search)||'%' OR
        EXISTS(SELECT 1 FROM public.ak_rubrica_nickname_history h
                WHERE h.contact_id=c.id AND h.old_nickname ILIKE '%'||btrim(p_search)||'%')
      )));
  RETURN v_result;
END; $$;

-- I nickname precedenti possono essere identificativi riservati.
CREATE OR REPLACE FUNCTION public.ak_rubrica_nickname_history(p_contact_id uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_result jsonb;
BEGIN
  IF NOT public.ak_rubrica_allowed('view_private_details') THEN RAISE EXCEPTION 'Storico riservato' USING ERRCODE='42501'; END IF;
  SELECT COALESCE(jsonb_agg(jsonb_build_object('old',h.old_nickname,'new',h.new_nickname,'at',h.changed_at)
    ORDER BY h.changed_at DESC),'[]'::jsonb) INTO v_result
  FROM public.ak_rubrica_nickname_history h JOIN public.ak_rubrica_contacts c ON c.id=h.contact_id
  WHERE h.contact_id=p_contact_id AND c.archived=false;
  RETURN v_result;
END; $$;

-- Flag extra consentito soltanto ad Admin/Owner tramite metodo preesistente.
CREATE OR REPLACE FUNCTION public.ak_rubrica_set_access(p_email text,p_flags jsonb)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_user uuid; v_clean jsonb;
BEGIN
  IF NOT EXISTS(SELECT 1 FROM public.clan_members m WHERE m.user_id=auth.uid() AND m.role='owner' AND m.status='active'
        AND m.clan_id=(SELECT c.id FROM public.clans c ORDER BY c.created_at ASC LIMIT 1)) THEN
    RAISE EXCEPTION 'Solo Admin/Owner puo gestire le autorizzazioni' USING ERRCODE='42501'; END IF;
  SELECT id INTO v_user FROM auth.users WHERE lower(email)=lower(btrim(p_email)) LIMIT 1;
  IF v_user IS NULL THEN RAISE EXCEPTION 'Account non trovato: deve prima registrarsi'; END IF;
  SELECT COALESCE(jsonb_object_agg(k, CASE WHEN p_flags->>k='true' THEN true ELSE false END),'{}'::jsonb) INTO v_clean
  FROM unnest(ARRAY['view_contacts','view_private_details','edit_contacts','change_nickname','view_phone','view_social','view_notes','archive_contacts']) AS k;
  -- Non consentire privilegi sui dettagli se è negato l'accesso rubrica.
  IF v_clean->>'view_contacts' <> 'true' THEN v_clean := '{}'::jsonb; END IF;
  INSERT INTO public.ak_rubrica_access(user_id,flags,updated_by) VALUES(v_user,v_clean,auth.uid())
  ON CONFLICT (user_id) DO UPDATE SET flags=excluded.flags,updated_by=auth.uid(),updated_at=now();
  RETURN true;
END; $$;

-- La lettura del bucket foto non deve diventare possibile con il solo accesso minimo dei membri.
DROP POLICY IF EXISTS ak30_rubrica_photo_read ON storage.objects;
CREATE POLICY ak30_rubrica_photo_read ON storage.objects FOR SELECT TO authenticated
USING (bucket_id='ak-rubrica-private' AND (
 (split_part(name,'/',1)='codm' AND public.ak_rubrica_allowed('view_private_details')) OR
 (split_part(name,'/',1)='personal' AND public.ak_rubrica_allowed('view_social') AND public.ak_rubrica_allowed('view_private_details'))));

-- Importazione cumulativa solo delle proposte screenshot EXACT già salvate da FIX30.
-- Nessuna fusione di due profili, nessun cambio UID/telefono, nickname precedente salvato.
-- Richiede clic esplicito Admin nel sito; NON viene eseguita da questa migrazione.
CREATE OR REPLACE FUNCTION public.ak_rubrica_apply_exact_screenshots()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_done integer := 0; s record; v_old text;
BEGIN
  IF NOT(public.ak_rubrica_allowed('manage_access') AND public.ak_rubrica_allowed('edit_contacts') AND public.ak_rubrica_allowed('change_nickname')) THEN
    RAISE EXCEPTION 'Operazione riservata agli amministratori della Rubrica' USING ERRCODE='42501'; END IF;
  FOR s IN
    SELECT q.id,q.source_name,q.match_contact_id FROM public.ak_rubrica_screenshot_candidates q
    WHERE q.status='exact' AND q.match_contact_id IS NOT NULL
      AND (SELECT count(*) FROM public.ak_rubrica_screenshot_candidates s2
           WHERE s2.match_contact_id=q.match_contact_id AND s2.status IN('exact','applied')) = 1
    ORDER BY q.source_name
    FOR UPDATE OF q
  LOOP
    IF length(btrim(s.source_name)) BETWEEN 2 AND 110 THEN
      SELECT c.nickname INTO v_old FROM public.ak_rubrica_contacts c
      WHERE c.id=s.match_contact_id AND c.archived=false FOR UPDATE;
      IF FOUND THEN
        IF v_old IS DISTINCT FROM btrim(s.source_name) THEN
          UPDATE public.ak_rubrica_contacts SET nickname=btrim(s.source_name),updated_by=auth.uid(),updated_at=now()
          WHERE id=s.match_contact_id;
          INSERT INTO public.ak_rubrica_nickname_history(contact_id,old_nickname,new_nickname,changed_by)
            VALUES(s.match_contact_id,v_old,btrim(s.source_name),auth.uid());
        END IF;
        UPDATE public.ak_rubrica_screenshot_candidates SET status='applied',confirmed_at=now(),confirmed_by=auth.uid() WHERE id=s.id;
        v_done := v_done + 1;
      END IF;
    END IF;
  END LOOP;
  RETURN v_done;
END; $$;

REVOKE ALL ON FUNCTION public.ak_rubrica_apply_exact_screenshots() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.ak_rubrica_apply_exact_screenshots() TO authenticated;
NOTIFY pgrst,'reload schema';
COMMIT;
-- Verifica amministrativa, dopo installazione:
-- SELECT count(*) FROM public.ak_rubrica_screenshot_candidates WHERE status='exact';
