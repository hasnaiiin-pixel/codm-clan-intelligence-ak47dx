# AK47DX Clan Manager — V14.2 FIX15 (TEST)

## Scopo
Aggiornare `/analytics` per visualizzare il totale di tutte le stagioni, comprese quelle storiche, e uno storico dettagliato degli scontri contro ciascun clan avversario, senza confondere le Scrim (serie) con le singole partite.

## Modifiche
1. **Filtro predefinito: Tutte le stagioni.** Somma stagioni attive, archiviate, storiche e risultati senza stagione riconosciuta. Il filtro su una stagione mostra unicamente quella.
2. **Tabella riepilogativa stagioni** con partite singole (G/V/P/N/WR), serie Scrim (G/V/P/N/WR), numero di registrazioni con solo risultato; click sul nome per filtrare.
3. **Storico per clan avversario** con conteggio Scrim, vittorie, sconfitte, pareggi, WR Scrim, numero di partite singole e loro bilancio, più storico espandibile (data, stagione, modalità, risultato, punteggio, disponibilità statistiche).
4. **Nomi avversari normalizzati** per differenze tra maiuscole e spazi: `RES`, `res`, `  RES  ` diventano lo stesso avversario nella visualizzazione, senza modificare i dati già registrati.
5. **Paginazione** delle tabelle partite, statistiche e scoreboard oltre 1.000 risultati (fino a 50.000 per tabella; oltre mostra un errore esplicito per evitare totali incompleti).
6. **Statistiche individuali** combinate tra scoreboard e `match_player_stats` legacy, evitando di conteggiare lo stesso giocatore nella stessa partita due volte quando l'identità coincide.
7. **Export Excel** con nuovi fogli `STAGIONI`, `CLAN_AVVERSARI`, `RISULTATI_SCRIM`, oltre agli esistenti; riepilogo W/L/WR separato tra serie e partite.
8. **Filtro clan avversario** applicato coerentemente ai risultati e alle statistiche delle partite corrispondenti.

## Regola fondamentale: NON sommare serie e partite
Una Scrim con punteggio finale 3-2 e `match_scope='series'` è **una Scrim** (1 incontro vinto), non 5 partite singole inventate. La percentuale vittorie Scrim è separata da quella delle partite singole. Se inserisci anche le 5 partite complete, esse compaiono nelle statistiche partite e non moltiplicano il numero delle Scrim.

I risultati con `record_quality='result_only'` incidono solo sui conteggi a livello di squadra e non generano dati giocatore K/D/A, tempo obiettivo o MVP inesistenti.

## Installazione patch (sopra V14.2 FIX12 o più recente se gli stessi file non sono stati modificati)
1. Esegui un backup Supabase prima del deploy.
2. Estrai lo ZIP FIX15 nella root del progetto Git, mantenendo `app/` e `src/` e sostituendo i file omonimi.
3. Da PowerShell:

```powershell
cd "C:\PERCORSO\CLAN_MANAGER_AK47DX"
npm ci --legacy-peer-deps
npm run build
```

4. **Solo se la build riesce**:

```powershell
git add -A
git commit -m "AK47DX V14.2 FIX15 statistiche stagioni e clan"
git push origin main
```

5. Vercel esegue il deploy. Apri **Statistiche** e controlla le due nuove tabelle.

**SQL:** non servono nuove migrazioni per FIX15. Per i risultati storici sono comunque necessarie le migrazioni V14.2 precedenti già applicate. FIX15 non cambia schema o record esistenti.

## Collaudo consigliato
- Seleziona Tutte le stagioni: somma S1 + S2 + stagioni storiche, più eventuali risultati non assegnati.
- Seleziona S1: visualizza solo S1, poi S2: solo S2, poi una stagione storica: solo quella.
- Importa due Scrim contro lo stesso clan con risultati 3-2 e 1-2: nello storico devono risultare 2 Scrim, 1 vinta e 1 persa, WR 50%.
- Verifica che maiuscole diverse nel nome del clan producano un'unica riga.
- Apri dettagli clan: data, stagione, punteggio e risultato devono corrispondere alle righe originali.
- Controlla che la vittoria di una serie 3-2 non aumenti di 5 le partite singole.
- Con una stagione filtrata, esporta Excel filtrato e verifica i fogli `STAGIONI`, `CLAN_AVVERSARI`, `RISULTATI_SCRIM`.
- Prova >1000 partite se presenti, per verificare la paginazione.

## Verifiche in preparazione
- Test automatici del modulo di riepilogo: **5/5 superati**.
- Verifica sintattica TS/TSX: **superata**.
- Build Next.js completa (`npm run build`): **non eseguibile in preparazione** per pacchetto npm `zlibjs` non disponibile nella cache offline. Va verificata prima del push su PC o Vercel.
- Nessun test su database Supabase live; versione **TEST**, non Official Stable.
