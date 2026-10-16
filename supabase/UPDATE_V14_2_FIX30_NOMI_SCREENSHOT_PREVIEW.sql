-- AK47DX FIX30 — Anteprima nickname letti dagli screenshot (senza telefonini o UID).
-- ESEGUIRE DOPO UPDATE_V14_2_FIX30_RUBRICA_PRO.sql.
-- Non modifica alcun nickname: carica solo proposte da confermare nell'interfaccia admin.
BEGIN;
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
), resolution AS (
 SELECT src.*,(SELECT c.id FROM public.ak_rubrica_contacts c WHERE upper(c.nickname)=upper(src.suggested_nickname) AND c.archived=false LIMIT 1) AS target_id
 FROM src
)
INSERT INTO public.ak_rubrica_screenshot_candidates(source_name,match_contact_id,status,review_note)
SELECT source_name,target_id,CASE WHEN target_id IS NOT NULL AND confidence='exact' THEN 'exact' ELSE 'review' END,note
FROM resolution
ON CONFLICT(source_name) DO NOTHING;
-- Dai ruoli visibili negli screenshot: MAESTRO DEL CLAN e VICE MAESTRO.
-- Aggiorna SOLO i ruoli lasciati provvisori, senza sostituire una scelta già fatta dall'Admin.
UPDATE public.ak_rubrica_contacts SET clan_role='Capo Clan',updated_at=now()
WHERE upper(nickname)='ALPHAWOLF' AND clan_role IN ('Direzione / da definire','Direzione / Staff da definire');
UPDATE public.ak_rubrica_contacts SET clan_role='Vice Capo',updated_at=now()
WHERE upper(nickname) IN ('TANJIRO','MANU') AND clan_role IN ('Direzione / da definire','Direzione / Staff da definire');
-- Nessuno è automaticamente designato Fondatore: ruolo non verificabile dagli screenshot.
COMMIT;
SELECT status, count(*) AS totali FROM public.ak_rubrica_screenshot_candidates GROUP BY status ORDER BY status;
