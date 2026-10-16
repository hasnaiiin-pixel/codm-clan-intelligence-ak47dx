-- AK47DX FIX31C: ripristino associazione nickname CODM tag AK + simboli.
-- ESEGUIRE DOPO FIX31B e hotfix screenshot_queue.
-- SAFE: installazione NON cambia nickname, UID, telefono, compleanno o altre schede.
-- I nickname proposti con il segno clan AKঐ DEVONO essere verificati visivamente
-- perché i caratteri decorativi CODM potrebbero differire dallo screenshot.
BEGIN;
DO $$ BEGIN
 IF to_regclass('public.ak_rubrica_screenshot_candidates') IS NULL THEN
  RAISE EXCEPTION 'Manca ak_rubrica_screenshot_candidates: applica la migrazione FIX31B';
 END IF;
 IF to_regprocedure('public.ak_rubrica_seed_screenshot_names()') IS NULL THEN
  RAISE EXCEPTION 'Manca ak_rubrica_seed_screenshot_names(): applica lo SQL FIX31B completo';
 END IF;
 IF to_regprocedure('public.ak_rubrica_allowed(text)') IS NULL THEN
  RAISE EXCEPTION 'Manca ak_rubrica_allowed(text): applica la migrazione Rubrica precedente';
 END IF;
END $$;

ALTER TABLE public.ak_rubrica_screenshot_candidates
 ADD COLUMN IF NOT EXISTS full_nickname text;

-- Confronta i nomi ignorando il SOLO prefisso AK + simbolo all'inizio.
-- Ignora segni grafici/punti, NON inventa equivalenze di nomi diversi (KIRA/KYRA).
CREATE OR REPLACE FUNCTION public.ak_rubrica_codm_key(p_name text)
RETURNS text LANGUAGE sql IMMUTABLE SET search_path = '' AS $$
 SELECT regexp_replace(
   regexp_replace(upper(btrim(coalesce(p_name,''))), '^(AK|ѦҞ)[^A-Z0-9]+', ''),
   '[^A-Z0-9]', '', 'g'
 );
$$;

-- Carica le proposte storiche (88 circa) e ne recupera il collegamento al profilo
-- usando una corrispondenza UNIVOCA, mai somiglianze generiche.
-- Non modifica nessun nickname senza azione esplicita dell'Admin.
CREATE OR REPLACE FUNCTION public.ak_rubrica_prepare_codm_names()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
 v public.ak_rubrica_screenshot_candidates%ROWTYPE;
 v_count integer;
 v_contact uuid;
 v_current text;
 v_full text;
 v_upd integer:=0;
 v_exact integer:=0;
 v_review integer:=0;
 v_applied integer:=0;
 v_is_exact boolean;
BEGIN
 IF NOT (public.ak_rubrica_allowed('manage_access') AND public.ak_rubrica_allowed('change_nickname')) THEN
  RAISE EXCEPTION 'Solo Admin autorizzato' USING ERRCODE='42501';
 END IF;
 PERFORM public.ak_rubrica_seed_screenshot_names();
 FOR v IN SELECT * FROM public.ak_rubrica_screenshot_candidates ORDER BY source_name FOR UPDATE LOOP
   -- Nomi senza tag AK chiaramente riconoscibili dalle immagini; gli altri sono proposte.
   -- Il tag simbolico proposto va CONTROLLATO prima di confermare in blocco.
   v_current:=NULL; v_contact:=NULL; v_count:=0;
   v_full := CASE
      WHEN v.source_name IN ('3vincenzo2','botgirl','yuna','BITEY','KITAWAGA','Andreaperseu31') THEN v.source_name
      WHEN v.source_name='AK' THEN 'AKঐ' -- nickname troppo corto, resta in verifica
      ELSE 'AKঐ' || v.source_name
   END;
   v_is_exact := coalesce(v.review_note,'') LIKE 'Presente:%';
   SELECT count(*), (array_agg(c.id ORDER BY c.id))[1] INTO v_count,v_contact
     FROM public.ak_rubrica_contacts c
     WHERE c.archived=false AND public.ak_rubrica_codm_key(c.nickname)=public.ak_rubrica_codm_key(v.source_name)
       AND length(public.ak_rubrica_codm_key(v.source_name))>=3;
   IF v_count=1 THEN
      SELECT nickname INTO v_current FROM public.ak_rubrica_contacts WHERE id=v_contact;
   ELSIF v.match_contact_id IS NOT NULL THEN
      -- Il vecchio import potrebbe avere già cambiato il nome base.
      SELECT nickname INTO v_current FROM public.ak_rubrica_contacts
        WHERE id=v.match_contact_id AND archived=false;
      IF v_current IS NOT NULL AND public.ak_rubrica_codm_key(v_current)=public.ak_rubrica_codm_key(v.source_name) THEN
        v_contact:=v.match_contact_id;v_count:=1;
      END IF;
   END IF;
   -- Se il profilo ha GIA' un tag del clan con simboli valido, non sostituirlo
   -- con la nostra trascrizione approssimata: conserva la grafia già esistente.
   IF v_current IS NOT NULL AND v_current ~* '^(AK|ѦҞ)[^A-Z0-9]+'
      AND public.ak_rubrica_codm_key(v_current)=public.ak_rubrica_codm_key(v.source_name) THEN
      v_full:=v_current;
   END IF;
   IF v_count=1 AND v_is_exact
       AND (v.match_contact_id IS NULL OR v.match_contact_id=v_contact)
       AND NOT EXISTS (SELECT 1 FROM public.ak_rubrica_screenshot_candidates other
              WHERE other.id<>v.id AND other.match_contact_id=v_contact
                AND other.status IN ('applied','exact')) THEN
      UPDATE public.ak_rubrica_screenshot_candidates
      SET full_nickname=v_full,match_contact_id=v_contact,
        status=CASE WHEN v_current=v_full THEN 'applied' ELSE 'exact' END
      WHERE id=v.id;
      IF v_current=v_full THEN v_applied:=v_applied+1;ELSE v_exact:=v_exact+1;END IF;
   ELSE
      -- Un'associazione ambigua non può essere confermata automaticamente.
      UPDATE public.ak_rubrica_screenshot_candidates
      SET full_nickname=v_full,
          match_contact_id=CASE WHEN v.match_contact_id IS NULL AND v_count=1 THEN v_contact ELSE match_contact_id END,
          status=CASE WHEN status='applied' AND v_current=v_full THEN 'applied' ELSE 'review' END
      WHERE id=v.id;
      v_review:=v_review+1;
   END IF;
   v_upd:=v_upd+1;
 END LOOP;
 RETURN jsonb_build_object('proposte',v_upd,'diretti_da_confermare',v_exact,
                           'da_verificare',v_review,'gia_applicati',v_applied);
END;
$$;

CREATE OR REPLACE FUNCTION public.ak_rubrica_screenshot_queue()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
DECLARE v jsonb;
BEGIN
 IF NOT public.ak_rubrica_allowed('manage_access') THEN
  RAISE EXCEPTION 'Solo Admin' USING ERRCODE='42501'; END IF;
 SELECT coalesce(jsonb_agg(jsonb_build_object(
    'id',s.id,'source_name',s.source_name,
    'full_nickname',s.full_nickname,
    'match_nickname',c.nickname,'match_contact_id',s.match_contact_id,
    'status',s.status,'review_note',s.review_note
 ) ORDER BY s.status,s.source_name),'[]'::jsonb)
 INTO v FROM public.ak_rubrica_screenshot_candidates s
 LEFT JOIN public.ak_rubrica_contacts c ON c.id=s.match_contact_id;
 RETURN v;
END;
$$;

-- Singola conferma: usa il nickname completo proposto, salvo modifica manuale Admin.
CREATE OR REPLACE FUNCTION public.ak_rubrica_accept_screenshot(
 p_candidate_id uuid,p_display_name text DEFAULT NULL
)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_s public.ak_rubrica_screenshot_candidates%ROWTYPE;v_old text;v_new text;
BEGIN
 IF NOT(public.ak_rubrica_allowed('manage_access') AND
        public.ak_rubrica_allowed('edit_contacts') AND
        public.ak_rubrica_allowed('change_nickname')) THEN
    RAISE EXCEPTION 'Solo Admin abilitato' USING ERRCODE='42501'; END IF;
 SELECT * INTO v_s FROM public.ak_rubrica_screenshot_candidates
   WHERE id=p_candidate_id FOR UPDATE;
 IF NOT FOUND OR v_s.match_contact_id IS NULL THEN RAISE EXCEPTION 'Abbinamento assente';END IF;
 IF v_s.status NOT IN ('exact','review') THEN RAISE EXCEPTION 'Proposta non modificabile';END IF;
 v_new:=btrim(coalesce(nullif(btrim(p_display_name),''),v_s.full_nickname,v_s.source_name));
 IF length(v_new) NOT BETWEEN 2 AND 110 THEN RAISE EXCEPTION 'Nome fuori misura';END IF;
 SELECT nickname INTO v_old FROM public.ak_rubrica_contacts
   WHERE id=v_s.match_contact_id AND archived=false FOR UPDATE;
 IF v_old IS NULL THEN RAISE EXCEPTION 'Profilo non trovato';END IF;
 IF EXISTS(SELECT 1 FROM public.ak_rubrica_contacts c WHERE c.id<>v_s.match_contact_id
           AND c.archived=false AND lower(c.nickname)=lower(v_new)) THEN
   RAISE EXCEPTION 'Nickname già utilizzato su un altro profilo'; END IF;
 IF v_old IS DISTINCT FROM v_new THEN
  UPDATE public.ak_rubrica_contacts SET nickname=v_new,updated_at=now(),updated_by=auth.uid()
   WHERE id=v_s.match_contact_id;
  INSERT INTO public.ak_rubrica_nickname_history(contact_id,old_nickname,new_nickname,changed_by)
   VALUES(v_s.match_contact_id,v_old,v_new,auth.uid());
 END IF;
 UPDATE public.ak_rubrica_screenshot_candidates
  SET status='applied',full_nickname=v_new,confirmed_at=now(),confirmed_by=auth.uid()
 WHERE id=p_candidate_id;
 RETURN true;
END;
$$;

-- Associazione multipla SOLO dei nomi a corrispondenza unica non già applicati.
-- Salva full_nickname e NON source_name: questa è la correzione essenziale FIX31C.
CREATE OR REPLACE FUNCTION public.ak_rubrica_apply_exact_codm_names()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE s record;v_old text;v_done integer:=0;
BEGIN
 IF NOT(public.ak_rubrica_allowed('manage_access') AND
        public.ak_rubrica_allowed('edit_contacts') AND
        public.ak_rubrica_allowed('change_nickname')) THEN
   RAISE EXCEPTION 'Solo Admin abilitato' USING ERRCODE='42501'; END IF;
 FOR s IN SELECT q.id,q.source_name,q.full_nickname,q.match_contact_id
   FROM public.ak_rubrica_screenshot_candidates q WHERE q.status='exact'
     AND q.match_contact_id IS NOT NULL AND nullif(btrim(q.full_nickname),'') IS NOT NULL
     AND (SELECT count(*) FROM public.ak_rubrica_screenshot_candidates k
           WHERE k.match_contact_id=q.match_contact_id AND k.status IN ('applied','exact'))=1
   ORDER BY q.source_name FOR UPDATE OF q LOOP
   IF length(s.full_nickname) NOT BETWEEN 2 AND 110 THEN CONTINUE;END IF;
   IF public.ak_rubrica_codm_key(s.full_nickname)<>public.ak_rubrica_codm_key(s.source_name) THEN
      CONTINUE; -- mai applicare un nome incompatibile
   END IF;
   SELECT nickname INTO v_old FROM public.ak_rubrica_contacts
    WHERE id=s.match_contact_id AND archived=false FOR UPDATE;
   IF v_old IS NOT NULL AND
      public.ak_rubrica_codm_key(v_old)=public.ak_rubrica_codm_key(s.source_name) AND
      NOT EXISTS(SELECT 1 FROM public.ak_rubrica_contacts c WHERE c.id<>s.match_contact_id
                 AND c.archived=false AND lower(c.nickname)=lower(s.full_nickname)) THEN
     IF v_old IS DISTINCT FROM s.full_nickname THEN
       UPDATE public.ak_rubrica_contacts SET nickname=s.full_nickname,updated_at=now(),updated_by=auth.uid()
         WHERE id=s.match_contact_id;
       INSERT INTO public.ak_rubrica_nickname_history(contact_id,old_nickname,new_nickname,changed_by)
         VALUES(s.match_contact_id,v_old,s.full_nickname,auth.uid());
     END IF;
     UPDATE public.ak_rubrica_screenshot_candidates
       SET status='applied',confirmed_at=now(),confirmed_by=auth.uid() WHERE id=s.id;
     v_done:=v_done+1;
   END IF;
 END LOOP;
 RETURN v_done;
END;
$$;

REVOKE ALL ON FUNCTION public.ak_rubrica_codm_key(text) FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.ak_rubrica_prepare_codm_names() FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.ak_rubrica_screenshot_queue() FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.ak_rubrica_accept_screenshot(uuid,text) FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.ak_rubrica_apply_exact_codm_names() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.ak_rubrica_prepare_codm_names() TO authenticated;
GRANT EXECUTE ON FUNCTION public.ak_rubrica_screenshot_queue() TO authenticated;
GRANT EXECUTE ON FUNCTION public.ak_rubrica_accept_screenshot(uuid,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.ak_rubrica_apply_exact_codm_names() TO authenticated;
NOTIFY pgrst,'reload schema';
COMMIT;

-- Controlli di installazione: devono essere TRUE.
SELECT
 to_regprocedure('public.ak_rubrica_prepare_codm_names()') IS NOT NULL AS prepara_nomil_codm,
 to_regprocedure('public.ak_rubrica_apply_exact_codm_names()') IS NOT NULL AS associa_nomi_codm,
 to_regprocedure('public.ak_rubrica_screenshot_queue()') IS NOT NULL AS coda_screenshot,
 (SELECT count(*) FROM public.ak_rubrica_screenshot_candidates) AS proposte_gia_presenti;
