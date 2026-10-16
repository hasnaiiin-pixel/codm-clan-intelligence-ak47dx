-- AK47DX V14.2 FIX29 - ADD-ON RUBRICA PRIVATA
-- Eseguire UNA VOLTA in SQL Editor Supabase; non modifica roster/tornei/statistiche.
-- NON inserire qui telefoni o dati personali: importali soltanto dopo, dal pannello protetto.
-- Accesso iniziale SOLO agli owner presenti in clan_members (status active).

BEGIN;

CREATE TABLE IF NOT EXISTS public.ak_rubrica_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nickname text NOT NULL,
  uid text,
  given_name text, surname text,
  phone text, phone_alt text, whatsapp_name text,
  birth_date date, city text, province text, country text,
  clan_role text NOT NULL DEFAULT 'Membro',
  clan_status text NOT NULL DEFAULT 'Attivo',
  whatsapp_group boolean NOT NULL DEFAULT true,
  joined_at date,
  notes text,
  codm_photo_url text, personal_photo_url text,
  tiktok text, instagram text, facebook text, youtube text, telegram text, discord text,
  archived boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS ak_rubrica_uid_unique ON public.ak_rubrica_contacts(uid) WHERE uid IS NOT NULL AND uid <> '' AND archived = false;
CREATE INDEX IF NOT EXISTS ak_rubrica_nickname_idx ON public.ak_rubrica_contacts(lower(nickname));

CREATE TABLE IF NOT EXISTS public.ak_rubrica_nickname_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id uuid NOT NULL REFERENCES public.ak_rubrica_contacts(id) ON DELETE CASCADE,
  old_nickname text NOT NULL, new_nickname text NOT NULL,
  changed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  changed_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.ak_rubrica_access (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  flags jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

-- No table reads/writes from browser, even if an old broad GRANT existed.
ALTER TABLE public.ak_rubrica_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ak_rubrica_nickname_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ak_rubrica_access ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.ak_rubrica_contacts, public.ak_rubrica_nickname_history, public.ak_rubrica_access FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.ak_rubrica_allowed(p_flag text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT auth.uid() IS NOT NULL AND (
    EXISTS (SELECT 1 FROM public.clan_members m
      WHERE m.user_id=auth.uid() AND m.role='owner' AND m.status='active'
        AND m.clan_id=(SELECT c.id FROM public.clans c ORDER BY c.created_at ASC LIMIT 1))
    OR EXISTS (SELECT 1 FROM public.ak_rubrica_access a
      WHERE a.user_id=auth.uid() AND a.flags->>p_flag='true')
  );
$$;

CREATE OR REPLACE FUNCTION public.ak_rubrica_my_permissions()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_flags jsonb := '{}'::jsonb; v_owner boolean;
BEGIN
  v_owner := EXISTS(SELECT 1 FROM public.clan_members m WHERE m.user_id=auth.uid() AND m.role='owner' AND m.status='active'
        AND m.clan_id=(SELECT c.id FROM public.clans c ORDER BY c.created_at ASC LIMIT 1));
  IF v_owner THEN
    RETURN '{"view_contacts":true,"edit_contacts":true,"change_nickname":true,"view_phone":true,"view_social":true,"view_notes":true,"archive_contacts":true,"manage_access":true}'::jsonb;
  END IF;
  SELECT a.flags INTO v_flags FROM public.ak_rubrica_access a WHERE a.user_id=auth.uid();
  RETURN COALESCE(v_flags,'{}'::jsonb);
END; $$;

-- Sensitive fields are stripped from the RPC output unless specifically allowed.
CREATE OR REPLACE FUNCTION public.ak_rubrica_redact(p_row public.ak_rubrica_contacts)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
DECLARE v jsonb;
BEGIN
  IF NOT public.ak_rubrica_allowed('view_contacts') THEN RAISE EXCEPTION 'Accesso rubrica negato' USING ERRCODE='42501'; END IF;
  v := to_jsonb(p_row) - 'created_by' - 'updated_by';
  IF NOT public.ak_rubrica_allowed('view_phone') THEN
    v := v - 'phone' - 'phone_alt' - 'whatsapp_name';
  END IF;
  IF NOT public.ak_rubrica_allowed('view_social') THEN
    v := v - 'tiktok' - 'instagram' - 'facebook' - 'youtube' - 'telegram' - 'discord' - 'personal_photo_url';
  END IF;
  IF NOT public.ak_rubrica_allowed('view_notes') THEN v := v - 'notes'; END IF;
  RETURN v;
END; $$;

CREATE OR REPLACE FUNCTION public.ak_rubrica_list(p_search text DEFAULT '')
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_result jsonb;
BEGIN
  IF NOT public.ak_rubrica_allowed('view_contacts') THEN RAISE EXCEPTION 'Accesso rubrica negato' USING ERRCODE='42501'; END IF;
  SELECT COALESCE(jsonb_agg(public.ak_rubrica_redact(c) ORDER BY lower(c.nickname)),'[]'::jsonb)
    INTO v_result FROM public.ak_rubrica_contacts c
    WHERE c.archived=false AND
      (COALESCE(btrim(p_search),'')='' OR c.nickname ILIKE '%'||btrim(p_search)||'%' OR
       c.uid ILIKE '%'||btrim(p_search)||'%' OR c.given_name ILIKE '%'||btrim(p_search)||'%' OR
       c.surname ILIKE '%'||btrim(p_search)||'%' OR
       EXISTS (SELECT 1 FROM public.ak_rubrica_nickname_history h
               WHERE h.contact_id=c.id AND h.old_nickname ILIKE '%'||btrim(p_search)||'%'));
  RETURN v_result;
END; $$;

CREATE OR REPLACE FUNCTION public.ak_rubrica_nickname_history(p_contact_id uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_result jsonb;
BEGIN
  IF NOT public.ak_rubrica_allowed('view_contacts') THEN RAISE EXCEPTION 'Accesso rubrica negato' USING ERRCODE='42501'; END IF;
  SELECT COALESCE(jsonb_agg(jsonb_build_object('old',h.old_nickname,'new',h.new_nickname,'at',h.changed_at) ORDER BY h.changed_at DESC),'[]'::jsonb)
  INTO v_result FROM public.ak_rubrica_nickname_history h WHERE h.contact_id=p_contact_id;
  RETURN v_result;
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

  IF NOT public.ak_rubrica_allowed('view_phone') AND (v_input ? 'phone' OR v_input ? 'phone_alt' OR v_input ? 'whatsapp_name') THEN
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

CREATE OR REPLACE FUNCTION public.ak_rubrica_archive(p_contact_id uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF NOT public.ak_rubrica_allowed('archive_contacts') OR NOT public.ak_rubrica_allowed('view_contacts') THEN RAISE EXCEPTION 'Non autorizzato' USING ERRCODE='42501'; END IF;
  UPDATE public.ak_rubrica_contacts SET archived=true,updated_by=auth.uid(),updated_at=now() WHERE id=p_contact_id AND NOT archived;
  RETURN FOUND;
END; $$;

CREATE OR REPLACE FUNCTION public.ak_rubrica_set_access(p_email text,p_flags jsonb)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_user uuid; v_clean jsonb;
BEGIN
  -- Configurazione esclusivamente per gli owner effettivi del sito.
  IF NOT EXISTS(SELECT 1 FROM public.clan_members m WHERE m.user_id=auth.uid() AND m.role='owner' AND m.status='active'
        AND m.clan_id=(SELECT c.id FROM public.clans c ORDER BY c.created_at ASC LIMIT 1)) THEN
    RAISE EXCEPTION 'Solo Admin/Owner puo gestire le autorizzazioni' USING ERRCODE='42501'; END IF;
  SELECT id INTO v_user FROM auth.users WHERE lower(email)=lower(btrim(p_email)) LIMIT 1;
  IF v_user IS NULL THEN RAISE EXCEPTION 'Account non trovato: deve prima registrarsi'; END IF;
  SELECT COALESCE(jsonb_object_agg(k, CASE WHEN p_flags->>k='true' THEN true ELSE false END),'{}'::jsonb) INTO v_clean
  FROM unnest(ARRAY['view_contacts','edit_contacts','change_nickname','view_phone','view_social','view_notes','archive_contacts']) AS k;
  INSERT INTO public.ak_rubrica_access(user_id,flags,updated_by)
  VALUES(v_user,v_clean,auth.uid()) ON CONFLICT (user_id) DO UPDATE SET flags=excluded.flags,updated_by=auth.uid(),updated_at=now();
  RETURN true;
END; $$;

-- RPCs only. Do not allow anonymous access or arbitrary direct table queries.
REVOKE ALL ON FUNCTION public.ak_rubrica_allowed(text),public.ak_rubrica_my_permissions(),public.ak_rubrica_redact(public.ak_rubrica_contacts),public.ak_rubrica_list(text),public.ak_rubrica_nickname_history(uuid),public.ak_rubrica_save(jsonb),public.ak_rubrica_archive(uuid),public.ak_rubrica_set_access(text,jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.ak_rubrica_allowed(text),public.ak_rubrica_my_permissions(),public.ak_rubrica_redact(public.ak_rubrica_contacts),public.ak_rubrica_list(text),public.ak_rubrica_nickname_history(uuid),public.ak_rubrica_save(jsonb),public.ak_rubrica_archive(uuid),public.ak_rubrica_set_access(text,jsonb) TO authenticated;
NOTIFY pgrst,'reload schema';
COMMIT;

-- Verifica dopo esecuzione: SELECT to_regclass('public.ak_rubrica_contacts');
