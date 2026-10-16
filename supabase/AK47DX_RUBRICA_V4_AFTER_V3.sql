-- AK47DX RUBRICA V4 - eseguire DOPO V1, V2, V3 (non pubblica dati).
-- I ruoli del CLAN nella rubrica non conferiscono alcun accesso al sito.
BEGIN;
-- Normalizza la vecchia dicitura generica: i 👑 della lista diventano
-- "Direzione/Staff da definire" finché l'Admin seleziona un ruolo preciso.
UPDATE public.rubrica_contacts
SET clan_role = 'dirigenza_staff_da_definire'
WHERE clan_role IN ('Capo / Co-capo / Vicecapo (da verificare)', 'dirigenza_da_verificare');

-- Memorizza la modifica del ruolo di gioco (nessun dato personale nel log).
CREATE OR REPLACE FUNCTION public.rubrica_audit_clan_role()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
 IF NEW.clan_role IS DISTINCT FROM OLD.clan_role THEN
   INSERT INTO public.rubrica_audit(actor_id, action, contact_id, detail)
   VALUES (auth.uid(), 'clan_role_changed', NEW.id,
      jsonb_build_object('old_role', OLD.clan_role, 'new_role', NEW.clan_role));
 END IF;
 RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS rubrica_clan_role_audit ON public.rubrica_contacts;
CREATE TRIGGER rubrica_clan_role_audit AFTER UPDATE OF clan_role ON public.rubrica_contacts
FOR EACH ROW EXECUTE FUNCTION public.rubrica_audit_clan_role();
-- Audit non sensibile del click sulla chat privata WhatsApp.
CREATE OR REPLACE FUNCTION public.rubrica_log_whatsapp_chat(p_contact_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
 IF NOT public.rubrica_can('view') THEN
   RAISE EXCEPTION 'Rubrica non autorizzata';
 END IF;
 IF NOT EXISTS (
   SELECT 1 FROM public.rubrica_contacts c
   JOIN public.rubrica_private p ON p.contact_id = c.id
   WHERE c.id = p_contact_id AND c.deleted_at IS NULL AND trim(p.phone) <> ''
     AND (public.rubrica_can('private') OR
       (public.rubrica_can('export') AND p.phone_share_approved))
 ) THEN RAISE EXCEPTION 'Contatto WhatsApp non autorizzato'; END IF;
 INSERT INTO public.rubrica_audit(actor_id, action, contact_id)
 VALUES(auth.uid(), 'whatsapp_chat_opened', p_contact_id);
END; $$;
REVOKE ALL ON FUNCTION public.rubrica_log_whatsapp_chat(uuid) FROM public,anon;
GRANT EXECUTE ON FUNCTION public.rubrica_log_whatsapp_chat(uuid) TO authenticated;
COMMIT;
