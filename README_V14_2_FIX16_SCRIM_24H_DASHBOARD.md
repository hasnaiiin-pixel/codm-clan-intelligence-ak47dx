# AK47DX Clan Manager — V14.2 TEST FIX16
## Riepilogo Scrim storiche + nuove e nuova Dashboard Statistiche

### Regola dei conteggi
- Ogni risultato `record_quality=result_only` importato in passato e ogni `match_scope=series` vale una Scrim completa.
- Ogni partita nella stagione storica (`is_historical=true`) vale una Scrim autonoma. Per compatibilita' con l'archivio originario, anche la stagione non attiva denominata `Stagione 1` viene interpretata come storica.
- Le nuove singole partite complete si raggruppano in una Scrim se: stesso `clan_id`, stesso `season_id`, stesso clan avversario (confronto senza differenze di maiuscole e spazi) e timestamp entro **24 ore dalla prima partita** del gruppo. La finestra NON si estende a catena.
- Le Scrim possono contenere Postazione, CED, Dominio, Controllo, mappe diverse. Il filtro di modalita'/mappa non spezza una Scrim nella vista panoramica.
- Se non si conoscono data o avversario, non si uniscono automaticamente partite diverse.
- Una Scrim con partite note e' VINTA se vittorie > sconfitte, PERSA se sconfitte > vittorie, altrimenti PAREGGIATA. Es. 2V+1P = Scrim Vinta 2-1; 1V+1P = Pareggio Scrim.
- Una Scrim storica con risultato 3-2 e' una Scrim, **non cinque righe fittizie**. Se successivamente esistono cinque partite reali con risultato corrispondente, nella medesima finestra e stagione, vengono mostrate come dettaglio della stessa Scrim.
- `Tutte le stagioni` somma tutte, anche storiche e partite senza stagione. Una singola stagione restituisce solo la sua porzione.
- Il totale delle Scrim = Scrim storiche + Scrim raggruppate nuove. I numeri di partite e le statistiche individuali restano distinti.

### Interfaccia
- In testa: Scrim totali, Scrim vinte, WR Scrim, partite con dati.
- Grafico degli esiti e grafico per stagione (cliccabile).
- Tabelle semplici per stagione e per clan; storico completo dentro un pannello espandibile.
- Risultati dei singoli incontri sotto ogni clan, con date, punteggi e modalita'/mappe delle partite.
- Filtri avanzati e grafici giocatori compressi in pannelli espandibili; i Tempi obiettivo rimangono visibili nella sezione dedicata.
- Fogli Excel `RIEPILOGO`, `STAGIONI`, `CLAN_AVVERSARI`, `RISULTATI_SCRIM` aggiornati con la stessa logica del sito.

### Installazione (patch sopra V14.2 FIX15)
1. Eseguire un backup dati (consigliato prima di ogni deploy).
2. Estrarre la PATCH FIX16 nella **radice** del progetto Git, sovrascrivendo i 3 file `app/analytics/page.tsx`, `app/globals.css` e aggiungendo `src/lib/scrimAggregation.ts`; preservare gli altri file.
3. `cd "C:\\PERCORSO\\CLAN_MANAGER_AK47DX"`
4. `npm ci --legacy-peer-deps`
5. `npm run build`
6. **Solo se** la build riesce: `git add -A`, `git commit -m "AK47DX V14.2 FIX16 scrim storico 24h dashboard"`, `git push origin main`.
7. Attendere il completamento del deployment Vercel e verificare la pagina Statistiche da PC e telefono.

**Non servono nuove migrazioni SQL**. FIX16 non modifica alcun dato nel database: i raggruppamenti sono calcolati in lettura. Se l'ambiente Vercel rifiuta il deploy, consultare il log del primo errore `Type error`, non i warning `deprecated`.

### Test
`node --experimental-strip-types --test tests/fix16_scrim_24h.test.mjs` (Node 22+)

Esempi da confrontare:
- 3 Scrim storiche contro RES nello stesso giorno = 3 Scrim.
- 3 nuove partite contro RES (2V, 1P) in 5 ore = 1 Scrim Vinta 2-1.
- 2 partite contro clan diverso = Scrim distinta.
- Una nuova partita 25 ore dopo la prima contro RES = seconda Scrim.
- Se `S1=10 Scrim` e `S2=5 Scrim`, `Tutte=15`, salvo incontri senza stagione che si sommano separatamente.
- I risultati di una Scrim storica non aggiungono Kill, Death, Assist, MVP o tempo obiettivo inesistenti.

### Stato tecnico
- Test unitari sul raggruppamento: 7/7 superati.
- Controlli sintattici sui TS/TSX modificati superati.
- La build completa `npm run build` non e' stata verificabile nel container: cache npm incompleta e problemi del client npm in download. NON considerare FIX16 una Official Stable prima di build e prove Supabase/Vercel.
