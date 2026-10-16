-- AK47DX FIX30 — RUBRICA: GRUPPI, FOTO PRIVATE, COMPLEANNI, MAPPA, EXPORT, SCREENSHOT
-- NON ELIMINA DATI. Eseguire dopo FIX29 Rubrica privata.
-- Eseguire lo SQL come un'unica query Supabase sul progetto corretto.
BEGIN;
ALTER TABLE public.ak_rubrica_contacts ADD COLUMN IF NOT EXISTS share_phone boolean NOT NULL DEFAULT false;
ALTER TABLE public.ak_rubrica_contacts ADD COLUMN IF NOT EXISTS map_opt_in boolean NOT NULL DEFAULT false;
-- Per privacy entrambi iniziano DISATTIVATI. La condivisione del telefono richiede scelta sul singolo contatto.

CREATE OR REPLACE FUNCTION public.ak_rubrica_redact(p_row public.ak_rubrica_contacts)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE v jsonb;
BEGIN
  IF NOT public.ak_rubrica_allowed('view_contacts') THEN RAISE EXCEPTION 'Accesso negato' USING ERRCODE='42501'; END IF;
  v := to_jsonb(p_row) - 'created_by' - 'updated_by';
  IF NOT public.ak_rubrica_allowed('view_phone') THEN
    v := v - 'phone' - 'phone_alt' - 'whatsapp_name' - 'share_phone';
  END IF;
  IF NOT public.ak_rubrica_allowed('view_social') THEN
    v := v - 'tiktok' - 'instagram' - 'facebook' - 'youtube' - 'telegram' - 'discord' - 'personal_photo_url';
  END IF;
  IF NOT public.ak_rubrica_allowed('view_notes') THEN v:=v-'notes'; END IF;
  RETURN v;
END; $$;

CREATE OR REPLACE FUNCTION public.ak_rubrica_save(p_contact jsonb)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_id uuid; v_prev public.ak_rubrica_contacts%ROWTYPE; v_next text;
  v_uid text; v_key text; v_input jsonb := p_contact;
BEGIN
  IF NOT public.ak_rubrica_allowed('edit_contacts') OR NOT public.ak_rubrica_allowed('view_contacts') THEN RAISE EXCEPTION 'Non autorizzato alla modifica' USING ERRCODE='42501'; END IF;
  IF jsonb_typeof(v_input) <> 'object' THEN RAISE EXCEPTION 'Dati non validi'; END IF;
  IF v_input ? 'id' AND nullif(v_input->>'id','') IS NOT NULL THEN
    v_id := (v_input->>'id')::uuid;
    SELECT * INTO v_prev FROM public.ak_rubrica_contacts WHERE id=v_id AND archived=false FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Contatto non trovato'; END IF;
  ELSE v_id:=gen_random_uuid(); END IF;

  v_next := btrim(COALESCE(v_input->>'nickname',v_prev.nickname,''));
  IF length(v_next)<2 OR length(v_next)>110 THEN RAISE EXCEPTION 'Nickname obbligatorio (2-110 caratteri)'; END IF;
  IF v_prev.id IS NOT NULL AND v_next IS DISTINCT FROM v_prev.nickname AND NOT public.ak_rubrica_allowed('change_nickname') THEN
    RAISE EXCEPTION 'Permesso cambio nickname mancante' USING ERRCODE='42501'; END IF;
  v_uid := nullif(btrim(COALESCE(v_input->>'uid',v_prev.uid,'')),'');
  IF v_uid IS NOT NULL AND v_uid !~ '^[0-9]{12,22}$' THEN RAISE EXCEPTION 'UID CODM: usare 12-22 cifre senza spazi'; END IF;

  IF NOT public.ak_rubrica_allowed('view_phone') AND (v_input ? 'phone' OR v_input ? 'phone_alt' OR v_input ? 'whatsapp_name' OR v_input ? 'share_phone') THEN
    RAISE EXCEPTION 'Permesso telefono mancante' USING ERRCODE='42501'; END IF;
  IF NOT public.ak_rubrica_allowed('view_social') AND (
    v_input ? 'tiktok' OR v_input ? 'instagram' OR v_input ? 'facebook' OR
    v_input ? 'youtube' OR v_input ? 'telegram' OR v_input ? 'discord' OR v_input ? 'personal_photo_url') THEN
    RAISE EXCEPTION 'Permesso social mancante' USING ERRCODE='42501'; END IF;
  IF NOT public.ak_rubrica_allowed('view_notes') AND v_input ? 'notes' THEN
    RAISE EXCEPTION 'Permesso note mancante' USING ERRCODE='42501'; END IF;

  IF v_prev.id IS NULL THEN
    INSERT INTO public.ak_rubrica_contacts(id,nickname,uid,created_by,updated_by)
    VALUES(v_id,v_next,v_uid,auth.uid(),auth.uid());
  ELSE
    UPDATE public.ak_rubrica_contacts SET nickname=v_next,uid=v_uid,updated_at=now(),updated_by=auth.uid() WHERE id=v_id;
    IF v_prev.nickname IS DISTINCT FROM v_next THEN
      INSERT INTO public.ak_rubrica_nickname_history(contact_id,old_nickname,new_nickname,changed_by)
      VALUES(v_id,v_prev.nickname,v_next,auth.uid());
    END IF;
  END IF;

  -- Update only fields supplied in JSON; hidden properties stay unchanged.
  UPDATE public.ak_rubrica_contacts c SET
    given_name=CASE WHEN v_input ? 'given_name' THEN nullif(btrim(v_input->>'given_name'),'') ELSE c.given_name END,
    surname=CASE WHEN v_input ? 'surname' THEN nullif(btrim(v_input->>'surname'),'') ELSE c.surname END,
    phone=CASE WHEN v_input ? 'phone' THEN nullif(btrim(v_input->>'phone'),'') ELSE c.phone END,
    phone_alt=CASE WHEN v_input ? 'phone_alt' THEN nullif(btrim(v_input->>'phone_alt'),'') ELSE c.phone_alt END,
    whatsapp_name=CASE WHEN v_input ? 'whatsapp_name' THEN nullif(btrim(v_input->>'whatsapp_name'),'') ELSE c.whatsapp_name END,
    birth_date=CASE WHEN v_input ? 'birth_date' THEN nullif(v_input->>'birth_date','')::date ELSE c.birth_date END,
    city=CASE WHEN v_input ? 'city' THEN nullif(btrim(v_input->>'city'),'') ELSE c.city END,
    province=CASE WHEN v_input ? 'province' THEN nullif(btrim(v_input->>'province'),'') ELSE c.province END,
    country=CASE WHEN v_input ? 'country' THEN nullif(btrim(v_input->>'country'),'') ELSE c.country END,
    clan_role=CASE WHEN v_input ? 'clan_role' THEN left(COALESCE(nullif(btrim(v_input->>'clan_role'),''),'Membro'),60) ELSE c.clan_role END,
    clan_status=CASE WHEN v_input ? 'clan_status' THEN left(COALESCE(nullif(btrim(v_input->>'clan_status'),''),'Attivo'),60) ELSE c.clan_status END,
    whatsapp_group=CASE WHEN v_input ? 'whatsapp_group' THEN COALESCE((v_input->>'whatsapp_group')::boolean,true) ELSE c.whatsapp_group END,
    share_phone=CASE WHEN v_input ? 'share_phone' THEN COALESCE((v_input->>'share_phone')::boolean,false) ELSE c.share_phone END,
    map_opt_in=CASE WHEN v_input ? 'map_opt_in' THEN COALESCE((v_input->>'map_opt_in')::boolean,false) ELSE c.map_opt_in END,
    joined_at=CASE WHEN v_input ? 'joined_at' THEN nullif(v_input->>'joined_at','')::date ELSE c.joined_at END,
    notes=CASE WHEN v_input ? 'notes' THEN nullif(left(btrim(v_input->>'notes'),3000),'') ELSE c.notes END,
    codm_photo_url=CASE WHEN v_input ? 'codm_photo_url' THEN nullif(btrim(v_input->>'codm_photo_url'),'') ELSE c.codm_photo_url END,
    personal_photo_url=CASE WHEN v_input ? 'personal_photo_url' THEN nullif(btrim(v_input->>'personal_photo_url'),'') ELSE c.personal_photo_url END,
    tiktok=CASE WHEN v_input ? 'tiktok' THEN nullif(btrim(v_input->>'tiktok'),'') ELSE c.tiktok END,
    instagram=CASE WHEN v_input ? 'instagram' THEN nullif(btrim(v_input->>'instagram'),'') ELSE c.instagram END,
    facebook=CASE WHEN v_input ? 'facebook' THEN nullif(btrim(v_input->>'facebook'),'') ELSE c.facebook END,
    youtube=CASE WHEN v_input ? 'youtube' THEN nullif(btrim(v_input->>'youtube'),'') ELSE c.youtube END,
    telegram=CASE WHEN v_input ? 'telegram' THEN nullif(btrim(v_input->>'telegram'),'') ELSE c.telegram END,
    discord=CASE WHEN v_input ? 'discord' THEN nullif(btrim(v_input->>'discord'),'') ELSE c.discord END,
    updated_at=now(),updated_by=auth.uid()
    WHERE c.id=v_id;
  RETURN v_id;
END; $$;


-- Bulk history for the private Admin workbook. Does not expose contact info to unauthorized users.
CREATE OR REPLACE FUNCTION public.ak_rubrica_export_history()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
DECLARE v jsonb;
BEGIN
 IF NOT public.ak_rubrica_allowed('manage_access') THEN RAISE EXCEPTION 'Solo Admin' USING ERRCODE='42501'; END IF;
 SELECT COALESCE(jsonb_agg(jsonb_build_object('nickname_attuale',c.nickname,'vecchio',h.old_nickname,'nuovo',h.new_nickname,'data',h.changed_at) ORDER BY h.changed_at DESC),'[]'::jsonb)
 INTO v FROM public.ak_rubrica_nickname_history h JOIN public.ak_rubrica_contacts c ON c.id=h.contact_id;
 RETURN v;
END; $$;

-- Screenshot candidates: no phone, email, UID or other personal details.
CREATE TABLE IF NOT EXISTS public.ak_rubrica_screenshot_candidates (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 source_name text NOT NULL UNIQUE,
 match_contact_id uuid REFERENCES public.ak_rubrica_contacts(id) ON DELETE SET NULL,
 status text NOT NULL DEFAULT 'review',
 review_note text,
 created_at timestamptz NOT NULL DEFAULT now(),
 confirmed_at timestamptz,
 confirmed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);
ALTER TABLE public.ak_rubrica_screenshot_candidates ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.ak_rubrica_screenshot_candidates FROM PUBLIC,anon,authenticated;

CREATE OR REPLACE FUNCTION public.ak_rubrica_screenshot_queue()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE v jsonb;
BEGIN
 IF NOT public.ak_rubrica_allowed('manage_access') THEN RAISE EXCEPTION 'Solo Admin' USING ERRCODE='42501'; END IF;
 SELECT COALESCE(jsonb_agg(jsonb_build_object('id',s.id,'source_name',s.source_name,'match_nickname',c.nickname,'match_contact_id',s.match_contact_id,'status',s.status,'review_note',s.review_note) ORDER BY s.status,s.source_name),'[]'::jsonb)
 INTO v FROM public.ak_rubrica_screenshot_candidates s LEFT JOIN public.ak_rubrica_contacts c ON c.id=s.match_contact_id;
 RETURN v;
END; $$;

CREATE OR REPLACE FUNCTION public.ak_rubrica_accept_screenshot(p_candidate_id uuid,p_display_name text DEFAULT NULL)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE v_s public.ak_rubrica_screenshot_candidates%ROWTYPE;v_old text;v_name text;
BEGIN
 IF NOT (public.ak_rubrica_allowed('manage_access') AND public.ak_rubrica_allowed('edit_contacts') AND public.ak_rubrica_allowed('change_nickname')) THEN RAISE EXCEPTION 'Solo Admin abilitato' USING ERRCODE='42501'; END IF;
 SELECT * INTO v_s FROM public.ak_rubrica_screenshot_candidates WHERE id=p_candidate_id FOR UPDATE;
 IF NOT FOUND OR v_s.match_contact_id IS NULL OR v_s.status='applied' THEN RAISE EXCEPTION 'Abbinamento non disponibile'; END IF;
 v_name:=btrim(COALESCE(NULLIF(p_display_name,''),v_s.source_name));
 IF length(v_name)<2 OR length(v_name)>110 THEN RAISE EXCEPTION 'Nome non valido (2-110 caratteri)'; END IF;
 SELECT nickname INTO v_old FROM public.ak_rubrica_contacts WHERE id=v_s.match_contact_id AND archived=false FOR UPDATE;
 IF v_old IS NULL THEN RAISE EXCEPTION 'Profilo non trovato'; END IF;
 IF v_old IS DISTINCT FROM v_name THEN
   UPDATE public.ak_rubrica_contacts SET nickname=v_name,updated_at=now(),updated_by=auth.uid() WHERE id=v_s.match_contact_id;
   INSERT INTO public.ak_rubrica_nickname_history(contact_id,old_nickname,new_nickname,changed_by) VALUES(v_s.match_contact_id,v_old,v_name,auth.uid());
 END IF;
 UPDATE public.ak_rubrica_screenshot_candidates SET status='applied',confirmed_at=now(),confirmed_by=auth.uid() WHERE id=p_candidate_id;
 RETURN true;
END; $$;

-- PRIVATE Supabase Storage bucket. All files stay PRIVATE; photos are accessed via short signed URLs.
INSERT INTO storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
VALUES ('ak-rubrica-private','ak-rubrica-private',false,3145728,ARRAY['image/jpeg','image/png','image/webp']::text[])
ON CONFLICT (id) DO UPDATE SET public=false,file_size_limit=3145728,allowed_mime_types=excluded.allowed_mime_types;
DROP POLICY IF EXISTS ak30_rubrica_photo_read ON storage.objects;
DROP POLICY IF EXISTS ak30_rubrica_photo_insert ON storage.objects;
DROP POLICY IF EXISTS ak30_rubrica_photo_delete ON storage.objects;
CREATE POLICY ak30_rubrica_photo_read ON storage.objects FOR SELECT TO authenticated
USING (bucket_id='ak-rubrica-private' AND (
 (split_part(name,'/',1)='codm' AND public.ak_rubrica_allowed('view_contacts')) OR
 (split_part(name,'/',1)='personal' AND public.ak_rubrica_allowed('view_social'))));
CREATE POLICY ak30_rubrica_photo_insert ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id='ak-rubrica-private' AND public.ak_rubrica_allowed('edit_contacts')
 AND split_part(name,'/',1) IN ('codm','personal')
 AND (split_part(name,'/',1)<>'personal' OR public.ak_rubrica_allowed('view_social')));
-- No general delete or update policy: replacing the file uses a new unique path, preserving history.

REVOKE ALL ON FUNCTION public.ak_rubrica_export_history(),public.ak_rubrica_screenshot_queue(),public.ak_rubrica_accept_screenshot(uuid,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.ak_rubrica_export_history(),public.ak_rubrica_screenshot_queue(),public.ak_rubrica_accept_screenshot(uuid,text) TO authenticated;
NOTIFY pgrst,'reload schema';
COMMIT;
-- Verifica: SELECT to_regclass('public.ak_rubrica_screenshot_candidates');
