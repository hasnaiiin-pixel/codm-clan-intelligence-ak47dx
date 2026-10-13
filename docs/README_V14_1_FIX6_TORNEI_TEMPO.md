# AK47DX V14.1 TEST — FIX6: iscrizioni tornei + Tempo obiettivo statistiche

**Base:** V14.1 TEST FIX5 (CONTROLLO) — fix cumulativo nella build completa, patch incrementale nella patch ZIP.
**Status:** test, NON Official Stable. Migrazioni dati: nessuna nuova.

## Modifiche

1. `/tournament` Iscrizioni: ricerca nickname da `players`, righe storiche alleate `match_scoreboard_rows` (incluse senza team_side definito) e `codm_tournament_registrations`; paginazione per superare limite 1000 righe; caricamento ripetuto dopo login e pulsante «Aggiorna elenco»; spiegazione visibile se manca accesso o la lista è vuota. Gli avversari `ENEMY` nelle righe storico sono esclusi. Si possono aggiungere giocatori esterni manualmente. I nomi nel selettore squadre includono anche i giocatori del roster.
2. `/analytics` Tempo obiettivo per giocatore in **Postazione, Dominio, Controllo** (alias DB CONTROL), con totale, media, massimo e numero partite, filtrati per stagione, clan, mappa e modalità. I dati provengono da scoreboard con fallback a match_player_stats; prevenzione dei doppi conteggi tra le due tabelle. Nuova colonna «Tempo obiettivo» nella classifica Top player solo quando pertinenti; nessuna metrica di tempo per CED e altre modalità. Esportazione delle righe Excel: Tempo obiettivo vuoto per le altre modalità.
3. `/players/[id]` Profilo: riepilogo tempi separati delle tre modalità, con totale e media.
4. `/import/match` Campo Tempo obiettivo visibile e salvato SOLO in Postazione, Dominio e Controllo. Non è più visibile né registrato per le altre modalità; un valore lasciato da una modalità precedente non passa in quelle non supportate.

## Presupposti DB

La migrazione V14 iniziale deve avere creato `objective_time_seconds`, `objective_time_text` su `match_scoreboard_rows` e `match_player_stats`. **FIX6 NON richiede SQL aggiuntivo**. Non eseguire `FINAL_SCHEMA_CLAN_MANAGER.sql` o reset: potrebbero riscrivere configurazioni esistenti.

I tempi compariranno SOLO se le importazioni hanno effettivamente salvato il tempo per ogni giocatore. Non si possono calcolare retroattivamente dagli screenshot senza nuova lettura o correzione.

## Installazione (PATCH)

1. Salva/archivia una copia del progetto Git e verifica il backup del database e Storage.
2. Estrarre `CODM_AK47DX_V14_1_FIX6_PATCH_TORNEI_TEMPI_STATS.zip` e copiare le cartelle `app` nel repository mantenendo i percorsi dei file. Conserva `.git` e `.env.local` senza sovrascriverli.
3. Dal terminale (PowerShell):

```powershell
cd "C:\PERCORSO\CLAN_MANAGER_AK47DX"
npm ci --legacy-peer-deps
npm run build
```

4. SOLO se la build riesce:

```powershell
git add -A
git commit -m "AK47DX V14.1 FIX6 torneo roster e tempo obiettivo stats"
git push origin main
```

5. Controllare il deploy su Vercel.

## Test manuali fondamentali

- Accedere come Staff/Admin, aprire Tornei → Iscrizioni. Nella ricerca digitare il nome di un giocatore esistente: deve apparire nell'elenco. Scegliere il nickname e aggiungerlo. Provare «Aggiorna elenco» e un giocatore presente solo in una partita storica.
- Verificare che un nickname avversario (`ENEMY`) non appaia per la sola origine delle righe storico.
- Aprire Statistiche, impostare Stagione 2 → Postazione. Se è stata importata una partita con `01:35`, verificare 01:35 nel totale (o somma con altre partite), media e dettaglio giocatore. Ripetere Dominio e Controllo.
- Selezionare CED: la sezione Tempo obiettivo e la colonna dedicata nella classifica NON devono apparire.
- Importa Partita: passare da Postazione a CED, salvare: il tempo non deve essere salvato nel record CED anche se precedentemente compilato.
- Verificare ancora creazione squadre 2VS2 e vecchie statistiche S1/S2.

## Verifica tecnica

Controllo di parsing TypeScript/TSX dell'intero codice superato (75 file, nessun errore sintattico). `npm ci --offline` non ha trovato i pacchetti nella cache e `npm ci` online non è terminato nell'ambiente di creazione. Non è quindi stato possibile verificare il `next build` completo né la connessione al database personale. **Non pubblicare come Official Stable senza passare `npm run build` e i test indicati.**
