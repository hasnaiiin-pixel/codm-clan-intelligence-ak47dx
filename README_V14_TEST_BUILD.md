# AK47DX V14.1 TEST — Release di prova (NON Official Stable)

## Hotfix 14.1 TEST FIX2 — Vercel TypeScript (09/10/2026)

- Corretto `app/import/match/page.tsx`: la mappa `Record<GameMode, string>` comprende ora le nuove modalità `CONTROLLO` e `ALTRO`. Risolve il blocco TypeScript `./app/import/match/page.tsx:375:9` segnalato dal deploy b2b2518.
- Allineato `src/lib/statistics.ts` per mostrare etichette coerenti nelle statistiche.
- Include anche FIX1 in `app/admin/seasons/page.tsx` (RPC Supabase chiamate come funzioni `async`).
- **Nessuna modifica SQL o ai dati** rispetto alla V14.1 TEST.
- La compilazione completa `npm run build` non è stata verificabile nell'ambiente di generazione: eseguire prima del push sulla macchina locale o verificare log Vercel.

## Hotfix 14.1 TEST FIX1 — Vercel TypeScript

- Corretto `app/admin/seasons/page.tsx`: le chiamate Supabase RPC usate nei pulsanti **Attiva** e **Archivia / Rendi attivabile** vengono ora racchiuse in funzioni `async`, che restituiscono una vera `Promise` come richiesto dall'helper `run()`.
- Risolve il primo errore TypeScript segnalato da Vercel al percorso `./app/admin/seasons/page.tsx:17:615`: `PostgrestFilterBuilder ... is missing ... from type Promise`.
- Nessuna migrazione SQL aggiuntiva rispetto alla V14.1 TEST originale.
- **Verifica:** il blocco non è stato riprodotto con una build completa in questo ambiente perché `npm ci` non riesce a raggiungere npm (`EAI_AGAIN`). Eseguire `npm run build` localmente o attendere il risultato del deploy Vercel.


**Partenza:** sorgente V14 Preview basata su V13.11.2.
**Hosting invariato:** Vercel + Supabase + GitHub. Nessun reset o migrazione verso VPS.

## Implementato in questa build

1. **Stagioni:** nuova pagina `/admin/seasons` (Owner): crea stagione storica con nome/date/descrizione, trasforma una stagione storica in ordinaria e attiva una nuova stagione senza riassegnare il vecchio archivio. Solo una stagione attiva; la stagione storica non diventa attiva automaticamente. Operazioni protette anche nel database con RPC che autorizzano esclusivamente l'Owner principale.
2. **Import storico** `/import/history`: risultati senza K/D/A, modalità CED/Postazione/Dominio/Controllo/Altro, clan già incontrati suggeriti oppure nome nuovo, punteggi ed esito calcolato, stagione NON attiva, date, mappa/nomi/nota e collegamento foto HTTPS facoltativi. Excel `.xlsx/.csv` con anteprima modificabile; fino a 100 record per salvataggio; controllo ID Excel ripetuti; backend `/api/history-results` verifica sessione e ruolo Staff/Coach/Owner.
3. **Statistiche e archivio:** etichetta «Solo risultato» vs «Completi»; distinzione incontro/serie vs partita singola, KPI delle scrim/serie separati dal Win Rate delle singole partite; esportazione Excel con indicazione livello e completezza. Risultati singoli storici includibili nei numeri del clan, senza creare finti dati player.
4. **Import completo:** importazione TEMPO_OBIETTIVO mm:ss da Excel (più intestazioni alternative, secondi espliciti e valori orario Excel), colonna editabile su PC e mobile, persistenza su `match_player_stats` e `match_scoreboard_rows`; tempo non disponibile = NULL, mai 00:00 fittizio. Correzioni su un record storico singolo salvano sullo stesso match_id, aggiornando completezza.
5. **Tournament Center:** iscrizione Staff da elenco incollato/roster, giocatori esterni non registrati, modifica nome squadra e titolari, controllo duplicazioni nominativi tra squadre, gironi visibili insieme in card separate, risultati e colori definitivi solo a girone concluso, generazione round robin con 11 coppie in 3 gironi 4+4+3, playoff dalle qualificate, tabellone scorrevole, lobby e arbitro e avviso conflitti.
6. **Restyling:** variabili colore AK47DX Modern Tactical, contrasto menu e tabelle, card gironi, colori playoff, focus tastiera, accesso alle pagine nuove dal menu PWA laterale. Menu basso preesistente preservato su una sola riga.
7. **Backup:** il download `.json.gz` precedente è preservato. Inserito **controllo di formato non distruttivo** di un archivio caricato da Admin Backup: mostra riepilogo senza scrivere in DB.

## IMPORTANTISSIMO: funzioni NON ancora collaudate/completate

- Questo ZIP **non è** la Official Stable. L'installazione Next.js non è riuscita nell'ambiente di generazione (dipendenze di rete non accessibili); `npm run build` non è stato completato qui. È stata verificata la sintassi TypeScript/TSX, non la compilazione end-to-end.
- Il **ripristino integrale da sito** resta deliberatamente disabilitato (rischio perdita utenti/Auth/Storage). La funzione di ispezione ZIP/GZ non è un restore.
- Il download backup dal sito **non comprende i file fisici Supabase Storage né auth.users**. Salvare ancora il backup pgAdmin e gli allegati separatamente.
- L'OCR per tempi obiettivo funziona solo se il parser/backend restituisce il valore. In caso contrario correggere a mano dall'anteprima; l'Excel contiene supporto mm:ss.
- Restano da collaudare sul progetto reale: avanzamento playoff dopo modifiche risultati già confermati, orari e notifiche Telegram, UX mobile e tutte le parti Events già presenti in V13.
- La sicurezza RLS delle tabelle legacy è ereditata dal database esistente e richiede una verifica specifica prima di una release pubblica.

## INSTALLAZIONE DI PROVA (raccomandata su clone/staging di Supabase)

1. Conservare una copia del progetto attuale e del `.backup` pgAdmin verificato. Copiare gli screenshot da Supabase Storage separatamente.
2. Su **un progetto Supabase di test con schema esistente** verificare che `supabase/UPDATE_V14_SEASONS_OBJECTIVE_NON_DESTRUCTIVE.sql` sia stato già eseguito (dall'installazione V14 Preview attuale). NON rieseguirlo acriticamente: potrebbe reimpostare la Stagione 2 come attiva e assegnare stagioni ai record senza season_id.
3. Eseguire **solo** `supabase/UPDATE_V14_1_HISTORY_SEASONS_NON_DESTRUCTIVE.sql` in **Supabase → SQL Editor** del database di test. Lo script usa ALTER ADD COLUMN IF NOT EXISTS e aggiunge funzioni RPC. Non elimina né ricrea statistiche.
4. Verificare in Supabase che compaiano colonne `record_quality`, `match_scope`, `historical_source_key` in `matches`, `is_historical` in `codm_seasons`, `lobby_name` in `codm_tournament_matches`. Prima prova poi produzione.
5. Estrarre ZIP nella cartella repository Git esistente (non eliminare `.git`) e impostare `.env.local` basandosi su `.env.example`. Non committare `.env.local`.
6. Comandi PowerShell essenziali:

```powershell
cd "C:\PERCORSO\CLAN_MANAGER_AK47DX"
npm ci --legacy-peer-deps
npm run build
npm run dev
```

7. Provare in locale `/admin/seasons`, `/import/history`, `/analytics`, `/matches`, `/tournament`, `/admin/backup`. Solo dopo test riusciti e migrazione SQL sul progetto corretto, fare deploy su Vercel tramite Git.

```powershell
git add -A
git commit -m "AK47DX V14 TEST - Stagioni storiche, import risultati, tempo obiettivo e tornei"
git push origin main
```

8. Verificare log di Vercel e schema Supabase. Se `npm run build` fallisce, **non fare push**: inviare l'errore per una correzione. Evitare sul database reale i file `RESET*`, `LOAD*` o `FINAL_SCHEMA_CLAN_MANAGER.sql`.

## Checklist test applicativo

- [ ] S1/S2 esistenti restano invariate e Stagione 2 è ancora attiva.
- [ ] Crea “Stagione storica 2025”, resta storica, compare nel filtro statistiche.
- [ ] Importa CED 6-4 «Solo risultato» sulla stagione storica; nessun player inventato.
- [ ] Importa un secondo risultato contro lo stesso clan: record distinto.
- [ ] Carica Excel vecchi risultati due volte: la seconda volta viene bloccata per chiave ID duplicata.
- [ ] KPI «Partite» diverso da KPI «Serie/Scrim», Win Rate corretti.
- [ ] Importa una Postazione con `TEMPO_OBIETTIVO=01:45` e controlla 105 secondi nel database e 01:45 nella UI.
- [ ] Importa Dominio con tempo vuoto: deve rimanere NULL, non 00:00.
- [ ] Iscrivi due giocatori dal roster e un ospite esterno in un torneo.
- [ ] Rinomina squadra; salva, prova un nome duplicato e un player già usato.
- [ ] Genera 11 squadre in tre gironi, assegna lobby/orari, controlla classifica e qualificazioni.
- [ ] Completa i gironi, genera playoff, controlla le migliori terze e avanzamento.
- [ ] Verifica l'archivio backup .json.gz senza modificare il database.
- [ ] Testare PWA su iOS/Android e menu inferiore in una sola riga.

## Nota sul backup

Il database SQL completo e l'archivio Storage vanno salvati separatamente anche dopo aver provato questa build. Il ripristino reale deve essere testato prima su un database distinto, mai dal pulsante web in questa build.
