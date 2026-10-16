-- AK47DX FIX31D - importazione assistita dei nickname NON abbinati
-- Da eseguire dopo le migrazioni Rubrica FIX31B + FIX31C.
-- NON sovrascrive telefono/UID. Nuovi contatti: stato "Da verificare", UID e telefono null.
-- Attenzione: per LEXO e RENDO lo stesso UID storico e' contestato: non viene copiato.
BEGIN;
DO $$ BEGIN
 IF to_regclass('public.ak_rubrica_contacts') IS NULL OR to_regclass('public.ak_rubrica_screenshot_candidates') IS NULL THEN
  RAISE EXCEPTION 'Rubrica FIX31B non installata'; END IF;
 IF to_regprocedure('public.ak_rubrica_codm_key(text)') IS NULL THEN
  RAISE EXCEPTION 'Esegui prima SQL FIX31C (ak_rubrica_codm_key mancante)'; END IF;
END $$;

-- La selezione della scheda e l'importazione richiedono un utente registrato
-- che disponga di TUTTI i permessi di amministrazione indicati.
CREATE OR REPLACE FUNCTION public.ak_rubrica_resolve_screenshot(
 p_candidate_id uuid, p_action text, p_contact_id uuid DEFAULT NULL, p_display_name text DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
 v_s public.ak_rubrica_screenshot_candidates%ROWTYPE;
 v_contact public.ak_rubrica_contacts%ROWTYPE;
 v_label text;
 v_matches integer;
 v_target uuid;
BEGIN
 IF NOT (public.ak_rubrica_allowed('manage_access') AND public.ak_rubrica_allowed('edit_contacts')
         AND public.ak_rubrica_allowed('change_nickname') AND public.ak_rubrica_allowed('view_contacts')) THEN
  RAISE EXCEPTION 'Solo Admin autorizzato puo risolvere nomi non abbinati' USING ERRCODE='42501';
 END IF;
 IF p_action IS NULL OR p_action NOT IN ('link','create') THEN RAISE EXCEPTION 'Azione non valida (link/create)'; END IF;
 SELECT * INTO v_s FROM public.ak_rubrica_screenshot_candidates WHERE id=p_candidate_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Proposta screenshot non trovata'; END IF;
 IF v_s.status='applied' THEN RAISE EXCEPTION 'Nickname gia confermato: modifica dal profilo'; END IF;
 IF v_s.match_contact_id IS NOT NULL THEN RAISE EXCEPTION 'Proposta gia collegata a una scheda: usa Conferma nome'; END IF;
 v_label:=btrim(coalesce(nullif(btrim(p_display_name),''),nullif(btrim(v_s.full_nickname),''),v_s.source_name));
 IF length(v_label) NOT BETWEEN 2 AND 110 THEN RAISE EXCEPTION 'Nickname non valido'; END IF;
 IF public.ak_rubrica_codm_key(v_label) IS DISTINCT FROM public.ak_rubrica_codm_key(v_s.source_name)
    THEN RAISE EXCEPTION 'Nome diverso dalla proposta. Controlla il nickname CODM prima di continuare'; END IF;
 IF p_action='link' THEN
   IF p_contact_id IS NULL THEN RAISE EXCEPTION 'Scegli una scheda esistente'; END IF;
   SELECT * INTO v_contact FROM public.ak_rubrica_contacts WHERE id=p_contact_id AND archived=false FOR UPDATE;
   IF NOT FOUND THEN RAISE EXCEPTION 'Contatto selezionato non esiste'; END IF;
   IF EXISTS(SELECT 1 FROM public.ak_rubrica_screenshot_candidates q
     WHERE q.id<>v_s.id AND q.match_contact_id=p_contact_id AND q.status IN ('review','exact','applied'))
   THEN RAISE EXCEPTION 'Questa scheda e gia collegata a un altro screenshot'; END IF;
   v_target:=p_contact_id;
   UPDATE public.ak_rubrica_screenshot_candidates SET
      match_contact_id=v_target,status='review',full_nickname=v_label,
      review_note='COLLEGATO MANUALMENTE: controllare nome, UID e telefono prima di confermare'
    WHERE id=v_s.id;
 ELSE
   IF p_contact_id IS NOT NULL THEN RAISE EXCEPTION 'Non specificare scheda esistente per create'; END IF;
   IF length(public.ak_rubrica_codm_key(v_s.source_name))<3 THEN
      RAISE EXCEPTION 'Nickname troppo corto/ambiguo: necessita verifica manuale'; END IF;
   SELECT count(*) INTO v_matches FROM public.ak_rubrica_contacts c
     WHERE c.archived=false AND public.ak_rubrica_codm_key(c.nickname)=public.ak_rubrica_codm_key(v_s.source_name);
   IF v_matches>0 THEN
      RAISE EXCEPTION 'Un profilo con nome equivalente esiste gia: usa Collega a scheda esistente per evitare duplicati'; END IF;
   IF EXISTS(SELECT 1 FROM public.ak_rubrica_screenshot_candidates q
      WHERE q.id<>v_s.id AND q.match_contact_id IS NOT NULL
         AND public.ak_rubrica_codm_key(q.source_name)=public.ak_rubrica_codm_key(v_s.source_name))
   THEN RAISE EXCEPTION 'Nome gia associato a un altro candidato, controllare duplicati'; END IF;
   INSERT INTO public.ak_rubrica_contacts(nickname,uid,phone,clan_role,clan_status,whatsapp_group,share_phone,archived,created_by,updated_by)
   VALUES (v_label,NULL,NULL,'Membro','Da verificare',false,false,false,auth.uid(),auth.uid())
   RETURNING id INTO v_target;
   UPDATE public.ak_rubrica_screenshot_candidates SET
      match_contact_id=v_target,status='review',full_nickname=v_label,
      review_note='NUOVO PROFILO INCOMPLETO: mancano UID, telefono, identita confermata e stato attivo verificato'
    WHERE id=v_s.id;
 END IF;
 RETURN jsonb_build_object('contact_id',v_target,'action',p_action,
   'missing_uid',(SELECT nullif(btrim(uid),'') IS NULL FROM public.ak_rubrica_contacts WHERE id=v_target),
   'missing_phone',(SELECT nullif(btrim(phone),'') IS NULL FROM public.ak_rubrica_contacts WHERE id=v_target),
   'pending_confirmation',true);
END;
$$;
REVOKE ALL ON FUNCTION public.ak_rubrica_resolve_screenshot(uuid,text,uuid,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.ak_rubrica_resolve_screenshot(uuid,text,uuid,text) TO authenticated;

-- LEXO: se esiste gia L.E.X.O/AKঐLEXO si collega la scheda senza cambiare dati.
-- Altrimenti crea solo nickname e stato "Da verificare": UID e telefono restano vuoti.
-- I dati originali RENDO/L.E.X.O presentavano un UID uguale: non copiarlo automaticamente.
DO $$
DECLARE v_count integer; v_id uuid;
BEGIN
 SELECT count(*),(array_agg(c.id ORDER BY c.id))[1] INTO v_count,v_id FROM public.ak_rubrica_contacts c
 WHERE c.archived=false AND public.ak_rubrica_codm_key(c.nickname)='LEXO';
 IF v_count>1 THEN
  RAISE NOTICE 'LEXO: esistono piu schede equivalenti; non creo e non collego nulla';
 ELSIF v_count=0 THEN
  INSERT INTO public.ak_rubrica_contacts(nickname,uid,phone,clan_role,clan_status,whatsapp_group,share_phone,archived)
  VALUES('AKঐLEXO',NULL,NULL,'Membro','Da verificare',false,false,false)
  RETURNING id INTO v_id;
 ELSE
  RAISE NOTICE 'LEXO: collego scheda gia esistente, senza cambiare telefono o UID';
 END IF;
 IF v_count<=1 THEN
   INSERT INTO public.ak_rubrica_screenshot_candidates(source_name,full_nickname,match_contact_id,status,review_note)
   VALUES('LEXO','AKঐLEXO',v_id,'review','LEXO: abbinamento da confermare. UID storico condiviso con RENDO; controllare UID e telefono')
   ON CONFLICT (source_name) DO UPDATE SET
     match_contact_id=CASE WHEN public.ak_rubrica_screenshot_candidates.status='applied' THEN public.ak_rubrica_screenshot_candidates.match_contact_id
                           WHEN public.ak_rubrica_screenshot_candidates.match_contact_id IS NULL THEN excluded.match_contact_id
                           ELSE public.ak_rubrica_screenshot_candidates.match_contact_id END,
     full_nickname=COALESCE(public.ak_rubrica_screenshot_candidates.full_nickname,excluded.full_nickname),
     review_note=CASE WHEN public.ak_rubrica_screenshot_candidates.status='applied'
                      THEN public.ak_rubrica_screenshot_candidates.review_note ELSE excluded.review_note END;
 END IF;
END;
$$;
NOTIFY pgrst,'reload schema';
COMMIT;

-- Resoconto NON sensibile: i contatti importati restano privati in Supabase.
SELECT c.nickname AS nickname_codm,c.clan_status,
  CASE WHEN nullif(btrim(c.uid),'') IS NULL THEN 'MANCANTE / DA VERIFICARE' ELSE 'PRESENTE: VERIFICARE CON RENDO' END AS uid,
  CASE WHEN nullif(btrim(c.phone),'') IS NULL THEN 'MANCANTE / DA VERIFICARE' ELSE 'PRESENTE' END AS telefono,
  s.status AS abbinamento
FROM public.ak_rubrica_screenshot_candidates s
JOIN public.ak_rubrica_contacts c ON c.id=s.match_contact_id
WHERE upper(s.source_name)='LEXO' AND c.archived=false;
