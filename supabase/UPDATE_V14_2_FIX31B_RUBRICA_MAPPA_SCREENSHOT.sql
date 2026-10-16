-- AK47DX FIX31B — RIPRISTINO MAPPA + CARICAMENTO PROPOSTE SCREENSHOT
-- Applica sullo stesso Supabase della Rubrica FIX29-FIX31A.
-- Non cancella contatti, ruoli, telefoni, UID, storico o foto.
-- Le proposte screenshot non modificano i nickname senza approvazione Admin nel sito.
BEGIN;
ALTER TABLE public.ak_rubrica_contacts ADD COLUMN IF NOT EXISTS city_lat double precision;
ALTER TABLE public.ak_rubrica_contacts ADD COLUMN IF NOT EXISTS city_lon double precision;
ALTER TABLE public.ak_rubrica_contacts ADD COLUMN IF NOT EXISTS map_opt_in boolean NOT NULL DEFAULT false;

-- RPC dedicato: aggiorna città + coordinate approssimate + consenso senza modificare dati anagrafici.
CREATE OR REPLACE FUNCTION public.ak_rubrica_set_map_location(
 p_contact_id uuid, p_city text, p_province text, p_country text,
 p_lat double precision, p_lon double precision, p_opt_in boolean)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
 IF NOT (public.ak_rubrica_allowed('edit_contacts') AND public.ak_rubrica_allowed('view_private_details')) THEN
  RAISE EXCEPTION 'Non autorizzato a modificare la località' USING ERRCODE='42501';
 END IF;
 IF COALESCE(p_opt_in,false) AND (
   nullif(btrim(COALESCE(p_city,'')),'') IS NULL OR
   nullif(btrim(COALESCE(p_country,'')),'') IS NULL OR
   p_lat IS NULL OR p_lon IS NULL OR
   p_lat NOT BETWEEN -85 AND 85 OR p_lon NOT BETWEEN -180 AND 180
 ) THEN RAISE EXCEPTION 'Seleziona una città valida dalla ricerca prima di attivare la mappa'; END IF;
 IF p_lat IS NOT NULL AND (p_lat < -85 OR p_lat > 85) THEN RAISE EXCEPTION 'Latitudine non valida'; END IF;
 IF p_lon IS NOT NULL AND (p_lon < -180 OR p_lon > 180) THEN RAISE EXCEPTION 'Longitudine non valida'; END IF;
 UPDATE public.ak_rubrica_contacts SET
   city = NULLIF(BTRIM(COALESCE(p_city,'')),''),
   province = NULLIF(BTRIM(COALESCE(p_province,'')),''),
   country = NULLIF(BTRIM(COALESCE(p_country,'')),''),
   city_lat = p_lat, city_lon = p_lon,
   map_opt_in = COALESCE(p_opt_in,false),
   updated_at = now(), updated_by = auth.uid()
 WHERE id=p_contact_id AND archived=false;
 IF NOT FOUND THEN RAISE EXCEPTION 'Profilo rubrica non trovato'; END IF;
 RETURN true;
END; $$;
REVOKE ALL ON FUNCTION public.ak_rubrica_set_map_location(uuid,text,text,text,double precision,double precision,boolean) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.ak_rubrica_set_map_location(uuid,text,text,text,double precision,double precision,boolean) TO authenticated;

-- Manteniamo la tabella proposte privata anche se la migrazione dei nomi FIX30 non fu eseguita.
CREATE TABLE IF NOT EXISTS public.ak_rubrica_screenshot_candidates (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), source_name text NOT NULL UNIQUE,
 match_contact_id uuid REFERENCES public.ak_rubrica_contacts(id) ON DELETE SET NULL,
 status text NOT NULL DEFAULT 'review',review_note text,
 created_at timestamptz NOT NULL DEFAULT now(),confirmed_at timestamptz,
 confirmed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);
ALTER TABLE public.ak_rubrica_screenshot_candidates ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.ak_rubrica_screenshot_candidates FROM PUBLIC,anon,authenticated;

-- Carica le trascrizioni screenshot senza cambiare persone o dati personali.
-- Deve essere attivata esplicitamente dall'Admin dalla schermata Rubrica > Nomi da screenshot.
CREATE OR REPLACE FUNCTION public.ak_rubrica_seed_screenshot_names()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_count integer:=0;
BEGIN
 IF NOT public.ak_rubrica_allowed('manage_access') THEN
  RAISE EXCEPTION 'Solo Admin/Owner può importare le proposte screenshot' USING ERRCODE='42501';
 END IF;
 WITH src(source_name,suggested_nickname,confidence,note) AS (VALUES
('Dr.Stone','DRSTONE','exact','Presente: verificare grafia esatta del prefisso/simboli'),
('APOLLO','','unmatched','Controllare manualmente: variazione/alias o UID assente'),
('juliet','JULIET','exact','Presente: verificare grafia esatta del prefisso/simboli'),
('Matty','MATTY','exact','Presente: verificare grafia esatta del prefisso/simboli'),
('Zam','ZAM','exact','Presente: verificare grafia esatta del prefisso/simboli'),
('Sweetvnom','','unmatched','Controllare manualmente: variazione/alias o UID assente'),
('diogreco','DIOGRECO','exact','Presente: verificare grafia esatta del prefisso/simboli'),
('Yami','YAMI','exact','Presente: verificare grafia esatta del prefisso/simboli'),
('JACK','JACK','exact','Presente: verificare grafia esatta del prefisso/simboli'),
('BLACKWOLF','BLACKWOLF','exact','Presente: verificare grafia esatta del prefisso/simboli'),
('Rainy','RAINY','exact','Presente: verificare grafia esatta del prefisso/simboli'),
('pippa','','unmatched','Controllare manualmente: variazione/alias o UID assente'),
('Jinwoo','','unmatched','Controllare manualmente: variazione/alias o UID assente'),
('Erika','ERIKETTA','review','Controllare manualmente: variazione/alias o UID assente'),
('SIM','SIM','exact','Presente: verificare grafia esatta del prefisso/simboli'),
('ODINO','ODINO','exact','Presente: verificare grafia esatta del prefisso/simboli'),
('Terrorist','TERRORIST','exact','Presente: verificare grafia esatta del prefisso/simboli'),
('OSIRIS','OSIRIS','exact','Presente: verificare grafia esatta del prefisso/simboli'),
('BROKEN','BROKEN','exact','Presente: verificare grafia esatta del prefisso/simboli'),
('Ghost','GHOST','exact','Presente: verificare grafia esatta del prefisso/simboli'),
('ChiaraMdd','CHIARAMDD','exact','Presente: verificare grafia esatta del prefisso/simboli'),
('bot','BOTGIRL','review','Controllare manualmente: variazione/alias o UID assente'),
('BloodHunt','','unmatched','Controllare manualmente: variazione/alias o UID assente'),
('shinobi','SHINOBI','exact','Presente: verificare grafia esatta del prefisso/simboli'),
('AleC','ALEC','exact','Presente: verificare grafia esatta del prefisso/simboli'),
('Zeyrox','','unmatched','Controllare manualmente: variazione/alias o UID assente'),
('SHADOW','SHADOW','exact','Presente: verificare grafia esatta del prefisso/simboli'),
('REINA','','unmatched','Controllare manualmente: variazione/alias o UID assente'),
('AK','AK','exact','Presente: verificare grafia esatta del prefisso/simboli'),
('PAX','PAX','exact','Presente: verificare grafia esatta del prefisso/simboli'),
('_Rendo','RENDO','review','Controllare manualmente: variazione/alias o UID assente'),
('Black','','unmatched','Controllare manualmente: variazione/alias o UID assente'),
('GlorY.','','unmatched','Controllare manualmente: variazione/alias o UID assente'),
('killer47','KILLER47','exact','Presente: verificare grafia esatta del prefisso/simboli'),
('Joke.','JOKE','exact','Presente: verificare grafia esatta del prefisso/simboli'),
('-Ale00','ALE00','exact','Presente: verificare grafia esatta del prefisso/simboli'),
('TACCITUA','TACCITUAYT','review','Controllare manualmente: variazione/alias o UID assente'),
('IlMagico','ILMAGICO','exact','Presente: verificare grafia esatta del prefisso/simboli'),
('WASAAAA06','Wasaaaa06','exact','Presente: verificare grafia esatta del prefisso/simboli'),
('3vincenzo2','3VINCENZO2','exact','Presente: verificare grafia esatta del prefisso/simboli'),
('ari','ARI','exact','Presente: verificare grafia esatta del prefisso/simboli'),
('LEXO','L.E.X.O','review','Controllare manualmente: variazione/alias o UID assente'),
('Ryuu','Ryuu','exact','Presente: verificare grafia esatta del prefisso/simboli'),
('DEMON','D3MON','review','Controllare manualmente: variazione/alias o UID assente'),
('Kira','KYRA','review','Controllare manualmente: variazione/alias o UID assente'),
('BlackDeat','BLACKDEATH','review','Controllare manualmente: variazione/alias o UID assente'),
('_Rendy','RENDY','exact','Presente: verificare grafia esatta del prefisso/simboli'),
('Groovylb','GROOVYIB','review','Controllare manualmente: variazione/alias o UID assente'),
('Raffalo','RAFFALO','exact','Presente: verificare grafia esatta del prefisso/simboli'),
('Mat','MAT','exact','Presente: verificare grafia esatta del prefisso/simboli'),
('TANK','','unmatched','Controllare manualmente: variazione/alias o UID assente'),
('francesca','FRANCESCA','exact','Presente: verificare grafia esatta del prefisso/simboli'),
('MIKY90NAP','MIKY90NAP','exact','Presente: verificare grafia esatta del prefisso/simboli'),
('alby','ALBY','exact','Presente: verificare grafia esatta del prefisso/simboli'),
('_SiRoK','SIROK','exact','Presente: verificare grafia esatta del prefisso/simboli'),
('LeviAckerman','LEVIACKERMAN','exact','Presente: verificare grafia esatta del prefisso/simboli'),
('gabri','','unmatched','Controllare manualmente: variazione/alias o UID assente'),
('TRYHARDER','TRYHARDER','exact','Presente: verificare grafia esatta del prefisso/simboli'),
('LUNA','LUNA','exact','Presente: verificare grafia esatta del prefisso/simboli'),
('Afrodite','AFRODITE','exact','Presente: verificare grafia esatta del prefisso/simboli'),
('Crastinus','CRASTINUS','exact','Presente: verificare grafia esatta del prefisso/simboli'),
('YUKO','YUKO','exact','Presente: verificare grafia esatta del prefisso/simboli'),
('BITEY','','unmatched','Controllare manualmente: variazione/alias o UID assente'),
('KITAWAGA','','unmatched','Controllare manualmente: variazione/alias o UID assente'),
('UniCredit','UNICREDIT','exact','Presente: verificare grafia esatta del prefisso/simboli'),
('Lilith','','unmatched','Controllare manualmente: variazione/alias o UID assente'),
('Jiren24','JIREN24','exact','Presente: verificare grafia esatta del prefisso/simboli'),
('ocraM','OCRAM','exact','Presente: verificare grafia esatta del prefisso/simboli'),
('Andreaperseu31','ANDREAPERSEU','review','Controllare manualmente: variazione/alias o UID assente'),
('Pablii','PABLII','exact','Presente: verificare grafia esatta del prefisso/simboli'),
('MIRZA','MIRZA','exact','Presente: verificare grafia esatta del prefisso/simboli'),
('Antonio','ANTONIO','exact','Presente: verificare grafia esatta del prefisso/simboli'),
('Royes.','ROYES','exact','Presente: verificare grafia esatta del prefisso/simboli'),
('Cashlanci','CASHLANCI','exact','Presente: verificare grafia esatta del prefisso/simboli'),
('Ezoryn','EZORYN','exact','Presente: verificare grafia esatta del prefisso/simboli'),
('botgirl','BOTGIRL','exact','Presente: verificare grafia esatta del prefisso/simboli'),
('TANJIRO','TANJIRO','exact','Presente: verificare grafia esatta del prefisso/simboli'),
('yuna','','unmatched','Controllare manualmente: variazione/alias o UID assente'),
('South.','SOUTH','exact','Presente: verificare grafia esatta del prefisso/simboli'),
('AlphaWolf','ALPHAWOLF','exact','Presente: verificare grafia esatta del prefisso/simboli'),
('MANU','MANU','exact','Presente: verificare grafia esatta del prefisso/simboli'),
('DOCANE','DOCANE','exact','Presente: verificare grafia esatta del prefisso/simboli'),
('Boston','BOSTON','exact','Presente: verificare grafia esatta del prefisso/simboli'),
('RINTARO','','unmatched','Controllare manualmente: variazione/alias o UID assente'),
('Rosa','ROSA','exact','Presente: verificare grafia esatta del prefisso/simboli'),
('Lucifer','LUCIFER','exact','Presente: verificare grafia esatta del prefisso/simboli'),
('sazuke','','unmatched','Controllare manualmente: variazione/alias o UID assente'),
('Pisto','IL PISTO','review','Controllare manualmente: variazione/alias o UID assente')
), dedup AS (
  SELECT DISTINCT ON (source_name) source_name,suggested_nickname,confidence,note
  FROM src ORDER BY source_name,confidence
 ), resolution AS (
  SELECT src.*,
    (SELECT c.id FROM public.ak_rubrica_contacts c
      WHERE upper(btrim(c.nickname))=upper(btrim(src.suggested_nickname)) AND c.archived=false
      AND NOT EXISTS (SELECT 1 FROM public.ak_rubrica_contacts d WHERE upper(btrim(d.nickname))=upper(btrim(src.suggested_nickname)) AND d.archived=false AND d.id<>c.id)
      LIMIT 1) AS target_id
  FROM dedup src
 )
 INSERT INTO public.ak_rubrica_screenshot_candidates(source_name,match_contact_id,status,review_note)
 SELECT source_name,target_id,
   CASE WHEN target_id IS NOT NULL AND confidence='exact' THEN 'exact' ELSE 'review' END,note
 FROM resolution
 ON CONFLICT(source_name) DO UPDATE SET
  match_contact_id=CASE WHEN public.ak_rubrica_screenshot_candidates.match_contact_id IS NULL
       THEN excluded.match_contact_id ELSE public.ak_rubrica_screenshot_candidates.match_contact_id END,
  status=CASE WHEN public.ak_rubrica_screenshot_candidates.status='applied' THEN 'applied'
       WHEN public.ak_rubrica_screenshot_candidates.match_contact_id IS NOT NULL
        THEN public.ak_rubrica_screenshot_candidates.status ELSE excluded.status END,
  review_note=COALESCE(public.ak_rubrica_screenshot_candidates.review_note,excluded.review_note);
 GET DIAGNOSTICS v_count=ROW_COUNT;
 RETURN v_count;
END; $$;
REVOKE ALL ON FUNCTION public.ak_rubrica_seed_screenshot_names() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.ak_rubrica_seed_screenshot_names() TO authenticated;
NOTIFY pgrst, 'reload schema';
COMMIT;
-- Verifica delle colonne e funzioni installate:
SELECT
 to_regclass('public.ak_rubrica_contacts') AS rubrica,
 to_regclass('public.ak_rubrica_screenshot_candidates') AS proposte,
 EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='ak_rubrica_contacts' AND column_name='city_lat') AS coordinate_presenti,
 to_regprocedure('public.ak_rubrica_set_map_location(uuid,text,text,text,double precision,double precision,boolean)') IS NOT NULL AS salva_mappa_presente,
 to_regprocedure('public.ak_rubrica_seed_screenshot_names()') IS NOT NULL AS carica_screenshot_presente;
