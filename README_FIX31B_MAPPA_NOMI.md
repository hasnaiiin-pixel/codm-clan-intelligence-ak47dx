# AK47DX V14.2 FIX31B — Mappa e nomi CODM dagli screenshot

## Correzioni
- Mappa rubrica con vere tessere OpenStreetMap (attribuzione inclusa) e pin città per i soli giocatori che hanno consentito la visualizzazione.
- Ricerca città con Open-Meteo/GeoNames, senza API key o GPS: selezionare un risultato (non digitare soltanto), poi flag consenso e **Salva scheda**.
- Nuova RPC `ak_rubrica_set_map_location` salva città, provincia, Paese, latitudine/longitudine approssimate e consenso; la pagina mostra errori DB espliciti.
- Indicazione dei profili senza città, non autorizzati e con coordinate ancora mancanti.
- Rubrica → Nomi da screenshot: pulsante **Carica i nickname dai 15 screenshot** e poi **Associa tutti i nomi con abbinamento diretto**. I casi ambigui restano da verificare; UID e telefoni restano invariati.
- I dati privati rimangono soggetti ai permessi FIX31A e Supabase RLS. Nessuna modifica automatica ai dati del database prima dell'esecuzione della migrazione e della conferma Admin.

## Installazione su FIX31A
1. Fare backup di progetto e DB; copiare il contenuto della patch nella cartella radice (non in una cartella aggiuntiva).
2. Supabase SQL Editor: eseguire `supabase/UPDATE_V14_2_FIX31B_RUBRICA_MAPPA_SCREENSHOT.sql` tutto insieme, sul progetto usato da Vercel. Deve esserci già la migrazione FIX29/FIX30/FIX31A.
3. Su PC, senza reinstallare npm: `npm run test:fix31b`, `npm run test:fix30`, `npm run test:fix31`, `npm run build`.
4. Se build OK: `git add -A`, `git commit -m "AK47DX FIX31B mappa rubrica e nomi screenshot"`, `git push origin main`.
5. Dopo deploy, controllare `/version` = FIX31B. Accedere con Owner e andare su Rubrica → Nomi da screenshot. Premere "Carica i nickname" per popolare l'elenco, controllare le corrispondenze e solo dopo confermare quelle dirette. Gli altri casi restano da correggere singolarmente.
6. Aprire un profilo → Modifica → Cerca città → scegliere un suggerimento → attivare il consenso (solo con l'accordo del giocatore) → Salva scheda. Visitare Rubrica → Mappa. Per profili vecchi già flaggati ma senza coordinate, selezionare nuovamente la città.

## Limiti e sicurezza
- **Google Places non è stato configurato**: il motore di ricerca è Open-Meteo/GeoNames, accessibile senza API key. La visualizzazione usa tile OpenStreetMap. L'attivazione Google Places richiederebbe credenziali, dominio abilitato e gestione dei costi.
- La creazione dei pin e i loro salvataggi richiedono test reali su Supabase e browser. I test locali non provano che l'SQL sia installato né che il servizio geocoding sia raggiungibile dalla rete del giocatore.
- Il nickname proveniente dallo screenshot può perdere simboli CODM: non aggiornare automaticamente corrispondenze incerte. I campi personali non sono inclusi nel seed SQL.
- Non rendere pubblica la mappa della rubrica; rimane consultabile soltanto da account autorizzati.
