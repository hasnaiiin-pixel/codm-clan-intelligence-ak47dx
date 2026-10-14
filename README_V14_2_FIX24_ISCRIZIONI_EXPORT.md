# AK47DX V14.2 FIX24 TEST — Iscrizione pubblica e Export Center

Baseline: FIX23 (tutti i componenti precedenti conservati). 14 ottobre 2026.

## Novità

- Pagina **`/iscrizione/<UUID del torneo>`** pubblica, adatta al cellulare e senza login.
- Campi obbligatori: Cognome, Nome, Nome in gioco CODM, UID numerico, accettazione dell'informativa privacy via link esterno HTTPS.
- Stato iscrizioni, limite partecipanti *individuali* facoltativo, conferma e riferimento domanda.
- Tournament Center → Iscrizioni: copia link WhatsApp, cerca/filtra, approva/rifiuta/annulla, modifica dati e cancella registrazioni prima che siano usate in partite/squadre.
- Approvazione: la richiesta pubblica crea un record nello storico iscrizioni del torneo già utilizzato per generare squadre; UID e dati anagrafici restano in una tabella privata separata.
- Tournament Center → Esportazioni: Excel 10 fogli (iscritti, squadre, gironi, classifiche, calendari, risultati, qualificazioni, Winners, Losers/Grand Final), CSV iscritti, PDF pubblico per calendario/classifiche, PDF A3 con schema e frecce del tabellone avanzato.
- Controlli: DB con RLS, funzioni RPC con privilege separation, UID univoco per torneo, consenso richiesto; honeypot base. **Non** è incluso un CAPTCHA o rate-limiter distribuito: per pubblicazioni su larga scala integrare una difesa anti-bot adeguata.

## Installazione patch, senza reinstallare dipendenze

1. Esegui **backup** del progetto e possibilmente del database Supabase prima di applicare modifiche.
2. Estrai lo ZIP **PATCH FIX24** direttamente nella cartella principale del progetto, sovrascrivendo le cartelle `app`, `src`, `tests`, `public`, `supabase` e `package.json`. NON aggiungere una cartella intermedia.
3. In Supabase → **SQL Editor**, esegui integralmente `supabase/UPDATE_V14_2_FIX24_PUBLIC_SIGNUPS.sql`. Lo script non cancella partite, tornei o iscritti esistenti. Non eseguire il RESET schema.
4. Dal terminale nella cartella progetto: `npm run test:fix24`, `npm run test:fix23`, `npm run test:bracket64`, `npm run build`. NON usare `npm ci` se le dipendenze sono già installate.
5. Se la build passa: `git add -A`, `git commit -m "AK47DX V14.2 FIX24 iscrizioni pubbliche export"`, `git push origin main`.
6. Verifica **`/version`** (FIX24), lo stato Production su Vercel e usa `/cache-reset` se la PWA mostra ancora FIX23.
7. Apri **Tornei → Crea/Gestisci**, scegli un torneo, imposta `Iscrizioni aperte`, URL HTTPS della **vera** informativa privacy del responsabile del trattamento e limite iscritti individuali facoltativo, quindi **Salva**.
8. Vai su **Tornei → Iscrizioni**, usa **Copia link**, aprilo in navigazione anonima e prova l'iscrizione. Lo staff connesso può approvarla; verifica l'arrivo automatico fra gli iscritti e la selezione nella creazione squadre.
9. Vai su **Tornei → Esportazioni** e prova XLSX/CSV/PDF.

## Test e sicurezza

- Sono stati eseguiti test locali JS sul motore FIX17–FIX23 e test statici del nuovo flusso FIX24.
- **Non** è stata completata una Next.js production build in questo ambiente per blocco dell'installazione delle dipendenze; rilascio **TEST**, compilare e verificare lato Vercel prima della pubblicazione ufficiale.
- I dati personali non sono leggibili tramite la funzione pubblica di consultazione torneo: espone solo nome, formato, disponibilità, privacy URL e numero richieste attive.
- Il personale deve testare in Supabase che utenti non staff NON possano fare SELECT della tabella `codm_tournament_public_signups`.
- Il limite individuale tiene conto delle richieste pubbliche attive, non dei giocatori già inseriti manualmente o dei team preesistenti.
- Il PDF pubblico esporta solo informazioni sportive; Excel/CSV includono dati personali e vanno trattati come documenti riservati, senza condividere pubblicamente.
- Correzione/cancellazione anagrafica bloccata quando il nickname è già collegato a squadre/partite, per non alterare risultati storici. Le richieste privacy in tale condizione vanno gestite dallo staff con una procedura specifica di conservazione/correzione dei dati.
- L'informativa deve essere predisposta e pubblicata dal responsabile del trattamento; l'app NON genera una privacy policy legale.
- **Non** inserire mai una chiave Supabase service_role nel frontend o in NEXT_PUBLIC_*.

## Pacchetti

- PATCH: file modificati e nuovi, destinata a una FIX23 funzionante.
- COMPLETE BUILD TEST: sorgenti completi (senza `node_modules`, `.env` e segreti). La cartella progetto estratta è pronta per installazione sul tuo PC.
