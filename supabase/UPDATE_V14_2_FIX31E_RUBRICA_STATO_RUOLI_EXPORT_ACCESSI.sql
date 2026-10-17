-- AK47DX V14.2 FIX31E TEST - migrazione NON distruttiva Rubrica Clan.
-- Eseguire DOPO gli SQL FIX29..FIX31D, in UN'UNICA query Supabase SQL Editor.
-- Nessun dato personale/telefono/UID specifico incorporato. Nessuna modifica a tornei e roster.
BEGIN;
ALTER TABLE public.ak_rubrica_contacts
  ADD COLUMN IF NOT EXISTS share_phone boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS secondary_roles text[] NOT NULL DEFAULT ARRAY[]::text[],
  ADD COLUMN IF NOT EXISTS public_profile_opt_in boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS public_consent_at timestamptz,
  ADD COLUMN IF NOT EXISTS public_consent_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;

-- Ripristina il blocco sulle tabelle private anche se una vecchia migrazione ha cambiato i GRANT.
ALTER TABLE public.ak_rubrica_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ak_rubrica_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ak_rubrica_nickname_history ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.ak_rubrica_contacts,public.ak_rubrica_access,public.ak_rubrica_nickname_history
 FROM PUBLIC,anon,authenticated;

-- Gli stati di appartenenza NON dipendono da WhatsApp, ruolo o completezza dati.
-- Non correggere massivamente stati storici (potrebbero essere intenzionali).
CREATE INDEX IF NOT EXISTS ak31e_rubrica_clan_status_idx
  ON public.ak_rubrica_contacts(clan_status) WHERE archived=false;

-- Un solo record configurazione pubblica. OFF finche' l'Owner non lo abilita.
CREATE TABLE IF NOT EXISTS public.ak_rubrica_public_settings (
  singleton boolean PRIMARY KEY DEFAULT true CHECK (singleton),
  enabled boolean NOT NULL DEFAULT false,
  show_nickname boolean NOT NULL DEFAULT true,
  show_uid boolean NOT NULL DEFAULT true,
  show_role boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);
INSERT INTO public.ak_rubrica_public_settings(singleton) VALUES(true)
ON CONFLICT(singleton) DO NOTHING;
ALTER TABLE public.ak_rubrica_public_settings ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.ak_rubrica_public_settings FROM PUBLIC,anon,authenticated;

-- Owner: visibilita' pubblica, gestione accessi e cancellazione. Non attribuire permessi app dai ruoli CODM.
CREATE OR REPLACE FUNCTION public.ak31e_rubrica_is_owner()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT auth.uid() IS NOT NULL AND EXISTS(
  SELECT 1 FROM public.clan_members m
  WHERE m.user_id=auth.uid() AND m.role='owner' AND m.status='active'
   AND m.clan_id=(SELECT c.id FROM public.clans c ORDER BY c.created_at ASC LIMIT 1));
$$;

-- Nuovi permessi. La configurazione del membro puo' essere gestita solo dall'Owner.
CREATE OR REPLACE FUNCTION public.ak_rubrica_my_permissions()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE v jsonb;
BEGIN
 IF public.ak31e_rubrica_is_owner() THEN
  RETURN '{"view_contacts":true,"view_private_details":true,"edit_contacts":true,"change_nickname":true,"view_phone":true,"view_social":true,"view_notes":true,"archive_contacts":true,"manage_access":true,"export_shared":true,"export_staff":true}'::jsonb;
 END IF;
 SELECT flags INTO v FROM public.ak_rubrica_access WHERE user_id=auth.uid();
 RETURN COALESCE(v,'{}'::jsonb);
END; $$;

CREATE OR REPLACE FUNCTION public.ak_rubrica_set_access(p_email text,p_flags jsonb)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE v_user uuid; v_clean jsonb;
BEGIN
 IF NOT public.ak31e_rubrica_is_owner() THEN RAISE EXCEPTION 'Solo Owner autorizzato' USING ERRCODE='42501'; END IF;
 SELECT id INTO v_user FROM auth.users WHERE lower(email)=lower(btrim(p_email)) LIMIT 1;
 IF v_user IS NULL THEN RAISE EXCEPTION 'Account non registrato: prima effettuare registrazione'; END IF;
 SELECT COALESCE(pg_catalog.jsonb_object_agg(k, COALESCE(p_flags->>k,'false')='true'),'{}'::jsonb)
 INTO v_clean FROM pg_catalog.unnest(ARRAY[
 'view_contacts','view_private_details','edit_contacts','change_nickname','view_phone',
 'view_social','view_notes','archive_contacts','export_shared','export_staff']) AS allowed(k);
 IF v_clean->>'view_contacts'<>'true' THEN v_clean:='{}'::jsonb; END IF;
 -- No permessi non previsti/privilegi di gestione ACL attribuibili con p_flags.
 INSERT INTO public.ak_rubrica_access(user_id,flags,updated_by,updated_at)
 VALUES(v_user,v_clean,auth.uid(),now())
 ON CONFLICT (user_id) DO UPDATE SET flags=excluded.flags,updated_by=excluded.updated_by,updated_at=now();
 RETURN true;
END; $$;

CREATE OR REPLACE FUNCTION public.ak_rubrica_list_access()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE v jsonb;
BEGIN
 IF NOT public.ak31e_rubrica_is_owner() THEN RAISE EXCEPTION 'Solo Owner autorizzato' USING ERRCODE='42501'; END IF;
 SELECT COALESCE(pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
   'user_id',a.user_id,'email',u.email,'flags',a.flags,'updated_at',a.updated_at)
   ORDER BY lower(u.email)),'[]'::jsonb)
 INTO v FROM public.ak_rubrica_access a JOIN auth.users u ON u.id=a.user_id;
 RETURN v;
END; $$;

CREATE OR REPLACE FUNCTION public.ak_rubrica_revoke_access(p_user_id uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF NOT public.ak31e_rubrica_is_owner() THEN RAISE EXCEPTION 'Solo Owner autorizzato' USING ERRCODE='42501'; END IF;
 IF p_user_id=auth.uid() THEN RAISE EXCEPTION 'Non revocare da qui il proprio account Owner'; END IF;
 DELETE FROM public.ak_rubrica_access WHERE user_id=p_user_id;
 RETURN FOUND;
END; $$;

-- Ruolo principale rimane clan_role; ruoli aggiuntivi indipendenti e senza privilegi software.
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

-- Consenso esplicito per il profilo PUBBLICO. Distinto da map_opt_in e share_phone.
CREATE OR REPLACE FUNCTION public.ak_rubrica_set_public_consent(p_contact_id uuid,p_opt_in boolean)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF NOT public.ak31e_rubrica_is_owner() THEN RAISE EXCEPTION 'Solo Owner puo pubblicare profili' USING ERRCODE='42501'; END IF;
 UPDATE public.ak_rubrica_contacts SET public_profile_opt_in=COALESCE(p_opt_in,false),
  public_consent_at=CASE WHEN p_opt_in THEN now() ELSE NULL END,
  public_consent_by=CASE WHEN p_opt_in THEN auth.uid() ELSE NULL END,
  updated_at=now(),updated_by=auth.uid()
 WHERE id=p_contact_id AND NOT archived;
 RETURN FOUND;
END; $$;

CREATE OR REPLACE FUNCTION public.ak_rubrica_public_admin_settings()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE v jsonb;
BEGIN
 IF NOT public.ak31e_rubrica_is_owner() THEN RAISE EXCEPTION 'Solo Owner' USING ERRCODE='42501'; END IF;
 SELECT to_jsonb(s)-'updated_by' INTO v FROM public.ak_rubrica_public_settings s WHERE singleton=true;
 RETURN COALESCE(v,'{}'::jsonb);
END; $$;

CREATE OR REPLACE FUNCTION public.ak_rubrica_set_public_settings(p_settings jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE v jsonb;
BEGIN
 IF NOT public.ak31e_rubrica_is_owner() THEN RAISE EXCEPTION 'Solo Owner' USING ERRCODE='42501'; END IF;
 UPDATE public.ak_rubrica_public_settings SET
 enabled=COALESCE((p_settings->>'enabled')::boolean,false),
 show_nickname=COALESCE((p_settings->>'show_nickname')::boolean,true),
 show_uid=COALESCE((p_settings->>'show_uid')::boolean,true),
 show_role=COALESCE((p_settings->>'show_role')::boolean,false),
 updated_at=now(),updated_by=auth.uid() WHERE singleton=true;
 SELECT to_jsonb(s)-'updated_by' INTO v FROM public.ak_rubrica_public_settings s WHERE singleton=true;
 RETURN v;
END; $$;

-- Accessibile anche ad anon: restituisce ESCLUSIVAMENTE dati non sensibili per contatti opt-in, se attivato.
-- Mai nome reale, telefono, mappe, IP, foto, note, compleanno, storico, social o indirizzi.
CREATE OR REPLACE FUNCTION public.ak_rubrica_public_directory()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE s public.ak_rubrica_public_settings%ROWTYPE; v jsonb;
BEGIN
 SELECT * INTO s FROM public.ak_rubrica_public_settings WHERE singleton=true;
 IF NOT FOUND OR NOT s.enabled THEN RETURN '[]'::jsonb; END IF;
 SELECT COALESCE(pg_catalog.jsonb_agg(
  (CASE WHEN s.show_nickname THEN pg_catalog.jsonb_build_object('nickname',c.nickname) ELSE '{}'::jsonb END)
  || (CASE WHEN s.show_uid THEN pg_catalog.jsonb_build_object('uid',c.uid) ELSE '{}'::jsonb END)
  || (CASE WHEN s.show_role THEN pg_catalog.jsonb_build_object('clan_role',c.clan_role) ELSE '{}'::jsonb END)
  ORDER BY lower(c.nickname)),'[]'::jsonb)
 INTO v FROM public.ak_rubrica_contacts c
 WHERE c.archived=false AND lower(btrim(c.clan_status))='attivo'
   AND c.public_profile_opt_in=true AND (s.show_nickname OR s.show_uid OR s.show_role);
 RETURN v;
END; $$;

-- Server-side export: controlli espliciti per export, privati e telefono.
-- La versione condivisibile restituisce nickname, UID, ruoli e telefono a operatori con export_shared e view_phone (senza flag contatto).
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

-- Privacy minima membro: a differenza dei contatti Admin, non visualizzare ruoli secondari/foto e dati sensibili.
CREATE OR REPLACE FUNCTION public.ak_rubrica_redact(p_row public.ak_rubrica_contacts)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE v jsonb;
BEGIN
 IF NOT public.ak_rubrica_allowed('view_contacts') THEN RAISE EXCEPTION 'Accesso rubrica negato' USING ERRCODE='42501'; END IF;
 IF NOT public.ak_rubrica_allowed('view_private_details') THEN
  RETURN pg_catalog.jsonb_build_object('id',p_row.id,'nickname',p_row.nickname,'uid',p_row.uid,
   'clan_role',p_row.clan_role,'clan_status',p_row.clan_status);
 END IF;
 v:=to_jsonb(p_row)-'created_by'-'updated_by'-'public_consent_by';
 IF NOT public.ak_rubrica_allowed('view_phone') THEN v:=v-'phone'-'phone_alt'-'whatsapp_name'-'share_phone'; END IF;
 IF NOT public.ak_rubrica_allowed('view_social') THEN
  v:=v-'tiktok'-'instagram'-'facebook'-'youtube'-'telegram'-'discord'-'personal_photo_url'; END IF;
 IF NOT public.ak_rubrica_allowed('view_notes') THEN v:=v-'notes'; END IF;
 RETURN v;
END; $$;

-- Membro base: solo attivi, filtrabili solo per nickname/UID. Case insensitive e spazi normalizzati.
CREATE OR REPLACE FUNCTION public.ak_rubrica_list(p_search text DEFAULT '')
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE v jsonb; v_details boolean;
BEGIN
 IF NOT public.ak_rubrica_allowed('view_contacts') THEN RAISE EXCEPTION 'Accesso rubrica negato' USING ERRCODE='42501'; END IF;
 v_details:=public.ak_rubrica_allowed('view_private_details');
 SELECT COALESCE(pg_catalog.jsonb_agg(public.ak_rubrica_redact(c) ORDER BY lower(c.nickname)),'[]'::jsonb)
 INTO v FROM public.ak_rubrica_contacts c
 WHERE c.archived=false AND (v_details OR lower(btrim(c.clan_status))='attivo')
 AND (COALESCE(btrim(p_search),'')='' OR c.nickname ILIKE '%'||btrim(p_search)||'%'
   OR c.uid ILIKE '%'||btrim(p_search)||'%'
   OR (v_details AND (c.given_name ILIKE '%'||btrim(p_search)||'%'
      OR c.surname ILIKE '%'||btrim(p_search)||'%'
      OR EXISTS(SELECT 1 FROM public.ak_rubrica_nickname_history h
         WHERE h.contact_id=c.id AND h.old_nickname ILIKE '%'||btrim(p_search)||'%'))));
 RETURN v;
END; $$;

-- Archivio + ripristino; la cancellazione definitiva e' riservata all'Owner e solo dopo archivio.
CREATE OR REPLACE FUNCTION public.ak_rubrica_list_archived()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE v jsonb;
BEGIN
 IF NOT public.ak31e_rubrica_is_owner() THEN RAISE EXCEPTION 'Solo Owner' USING ERRCODE='42501'; END IF;
 SELECT COALESCE(pg_catalog.jsonb_agg(public.ak_rubrica_redact(c) ORDER BY lower(c.nickname)),'[]'::jsonb)
 INTO v FROM public.ak_rubrica_contacts c WHERE c.archived=true;
 RETURN v;
END; $$;

CREATE OR REPLACE FUNCTION public.ak_rubrica_restore(p_contact_id uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF NOT public.ak31e_rubrica_is_owner() THEN RAISE EXCEPTION 'Solo Owner' USING ERRCODE='42501'; END IF;
 UPDATE public.ak_rubrica_contacts SET archived=false,updated_at=now(),updated_by=auth.uid()
 WHERE id=p_contact_id AND archived=true;
 RETURN FOUND;
END; $$;

CREATE OR REPLACE FUNCTION public.ak_rubrica_delete_permanently(p_contact_id uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE v_archived boolean;
BEGIN
 IF NOT public.ak31e_rubrica_is_owner() THEN RAISE EXCEPTION 'Solo Owner' USING ERRCODE='42501'; END IF;
 SELECT archived INTO v_archived FROM public.ak_rubrica_contacts WHERE id=p_contact_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Contatto non trovato'; END IF;
 IF NOT v_archived THEN RAISE EXCEPTION 'Archivia prima il contatto'; END IF;
 -- Prevenire foto orfane: eliminare gli oggetti dal bucket privato con console Supabase.
 IF EXISTS(SELECT 1 FROM storage.objects o WHERE o.bucket_id='ak-rubrica-private'
    AND (o.name LIKE 'codm/'||p_contact_id::text||'/%' OR o.name LIKE 'personal/'||p_contact_id::text||'/%')) THEN
  RAISE EXCEPTION 'Foto archiviate presenti: elimina prima i file dal bucket privato'; END IF;
 -- Eventuali FK collegate impediscono DELETE. Non toccare profili app, statistiche o partite.
 DELETE FROM public.ak_rubrica_contacts WHERE id=p_contact_id AND archived=true;
 RETURN FOUND;
END; $$;

REVOKE ALL ON FUNCTION public.ak31e_rubrica_is_owner(),public.ak_rubrica_list_access(),
 public.ak_rubrica_revoke_access(uuid),public.ak_rubrica_set_secondary_roles(uuid,text[]),
 public.ak_rubrica_set_public_consent(uuid,boolean),public.ak_rubrica_public_admin_settings(),
 public.ak_rubrica_set_public_settings(jsonb),public.ak_rubrica_public_directory(),
 public.ak_rubrica_export(text,boolean),public.ak_rubrica_list_archived(),
 public.ak_rubrica_restore(uuid),public.ak_rubrica_delete_permanently(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.ak31e_rubrica_is_owner(),public.ak_rubrica_list_access(),
 public.ak_rubrica_revoke_access(uuid),public.ak_rubrica_set_secondary_roles(uuid,text[]),
 public.ak_rubrica_set_public_consent(uuid,boolean),public.ak_rubrica_public_admin_settings(),
 public.ak_rubrica_set_public_settings(jsonb),public.ak_rubrica_export(text,boolean),
 public.ak_rubrica_list_archived(),public.ak_rubrica_restore(uuid),
 public.ak_rubrica_delete_permanently(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.ak_rubrica_public_directory() TO anon,authenticated;
REVOKE ALL ON FUNCTION public.ak_rubrica_my_permissions(),public.ak_rubrica_set_access(text,jsonb),
 public.ak_rubrica_list(text),public.ak_rubrica_redact(public.ak_rubrica_contacts) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.ak_rubrica_my_permissions(),public.ak_rubrica_set_access(text,jsonb),
 public.ak_rubrica_list(text),public.ak_rubrica_redact(public.ak_rubrica_contacts) TO authenticated;
NOTIFY pgrst,'reload schema';
COMMIT;
