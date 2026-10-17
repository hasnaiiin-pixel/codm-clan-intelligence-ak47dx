-- AK47DX V14.2 FIX31F TEST - migrazione non distruttiva: eseguire DOPO FIX31E / eventuale HOTFIX ruoli.
-- NESSUN contatto/UID/telefono reale incorporato. Nessuna alterazione dei dati esistenti.
-- I numeri NON richiedono il flag individuale share_phone, ma l'esportazione è riservata a chi ha
-- ENTRAMBI i permessi server: export_shared + view_phone (oltre all'accesso Rubrica).
-- I dati pubblici dei visitatori e il consenso public_profile_opt_in restano invariati.
BEGIN;

CREATE OR REPLACE FUNCTION public.ak_rubrica_set_secondary_roles(p_contact_id uuid,p_roles text[])
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE v_main text; v_clean text[];
BEGIN
 IF NOT (public.ak_rubrica_allowed('edit_contacts') AND public.ak_rubrica_allowed('view_private_details')) THEN
  RAISE EXCEPTION 'Permesso modifica mancante' USING ERRCODE='42501'; END IF;
 SELECT clan_role INTO v_main FROM public.ak_rubrica_contacts WHERE id=p_contact_id AND NOT archived FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Contatto non trovato'; END IF;
 IF COALESCE(pg_catalog.array_length(p_roles,1),0)>12 THEN RAISE EXCEPTION 'Massimo 12 incarichi'; END IF;
 IF EXISTS(SELECT 1 FROM pg_catalog.unnest(COALESCE(p_roles,ARRAY[]::text[])) AS rol(v)
   WHERE btrim(v)='' OR length(v)>60 OR v IS NULL) THEN RAISE EXCEPTION 'Ruolo aggiuntivo non valido'; END IF;
 SELECT COALESCE(pg_catalog.array_agg(r ORDER BY r),ARRAY[]::text[]) INTO v_clean FROM (
  SELECT DISTINCT btrim(v) AS r FROM pg_catalog.unnest(COALESCE(p_roles,ARRAY[]::text[])) AS rol(v)
  WHERE btrim(v)<>'' AND btrim(v)<>COALESCE(v_main,'')) s;
 UPDATE public.ak_rubrica_contacts SET secondary_roles=v_clean,updated_at=now(),updated_by=auth.uid()
 WHERE id=p_contact_id;
 RETURN true;
END; $$;

CREATE OR REPLACE FUNCTION public.ak_rubrica_export(p_mode text DEFAULT 'shared',p_only_active boolean DEFAULT true)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE v jsonb; v_full boolean := p_mode='staff';
BEGIN
 IF NOT public.ak_rubrica_allowed('view_contacts') THEN RAISE EXCEPTION 'Accesso rubrica mancante' USING ERRCODE='42501'; END IF;
 IF p_mode NOT IN('shared','staff') THEN RAISE EXCEPTION 'Modalita export non valida'; END IF;
 IF v_full AND NOT (public.ak_rubrica_allowed('export_staff') AND public.ak_rubrica_allowed('view_private_details')) THEN
  RAISE EXCEPTION 'Export Staff non autorizzato' USING ERRCODE='42501'; END IF;
 IF NOT v_full AND NOT (public.ak_rubrica_allowed('export_shared') AND public.ak_rubrica_allowed('view_phone')) THEN
  RAISE EXCEPTION 'Export condivisibile richiede export_shared e view_phone' USING ERRCODE='42501'; END IF;
 SELECT COALESCE(pg_catalog.jsonb_agg(
  (CASE WHEN v_full THEN public.ak_rubrica_redact(c)
   || pg_catalog.jsonb_build_object('history',(
    SELECT COALESCE(pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object('old',h.old_nickname,'new',h.new_nickname,'at',h.changed_at)
      ORDER BY h.changed_at DESC),'[]'::jsonb)
    FROM public.ak_rubrica_nickname_history h WHERE h.contact_id=c.id))
   ELSE pg_catalog.jsonb_build_object(
     'nickname',c.nickname,'uid',c.uid,'clan_role',c.clan_role,'secondary_roles',c.secondary_roles,
     'phone',c.phone)
   END)
  ORDER BY CASE WHEN c.clan_role IN('Fondatore','Capo Clan') THEN 0 WHEN c.clan_role IN('Co-Capo','Vice Capo') THEN 1
   WHEN c.clan_role IN('Staff','Moderatore','Responsabile Scrim','Responsabile Tornei','Responsabile Reclutamento','Allenatore','Responsabile Rubrica','Responsabile Staff','Capitano Team','Vice Capitano','Organizzatore Eventi','Responsabile Statistiche','Admin Clan') THEN 2
   WHEN c.clan_role IN('Direzione / da definire','Direzione / Staff da definire') THEN 3
   WHEN c.clan_role='Ex membro' AND lower(btrim(c.clan_status))<>'attivo' THEN 5 ELSE 4 END,
  lower(c.nickname)),'[]'::jsonb)
 INTO v FROM public.ak_rubrica_contacts c
 WHERE c.archived=false AND (NOT p_only_active OR lower(btrim(c.clan_status))='attivo');
 RETURN v;
END; $$;

-- Mantieni la protezione delle funzioni RPC al livello database.
REVOKE ALL ON FUNCTION public.ak_rubrica_set_secondary_roles(uuid,text[]), public.ak_rubrica_export(text,boolean) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.ak_rubrica_set_secondary_roles(uuid,text[]), public.ak_rubrica_export(text,boolean) TO authenticated;
NOTIFY pgrst,'reload schema';
COMMIT;
