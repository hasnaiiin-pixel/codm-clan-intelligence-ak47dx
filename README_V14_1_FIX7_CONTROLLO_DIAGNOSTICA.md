# AK47DX V14.1 TEST FIX7 — Salvataggio Controllo con diagnostica completa

## Problema osservato
Quando si sceglie CONTROlLO in **Importa partita** e si preme Salva, l'interfaccia precedente riportava i messaggi solamente in alto. Alcuni errori dopo l'inserimento (es. salvataggio statistiche/evento) erano segnalati come se l'intera partita non fosse stata salvata, esponendo al rischio di duplicazioni. Le correzioni FIX5/FIX6 non hanno risolto il problema per il database dell'utente.

## Interventi FIX7
- Stato salvataggio ed errori visibili **subito sotto il pulsante Salva**, con fase e dettagli Supabase `code/message/details/hint`.
- Validazione del Tempo obiettivo `mm:ss` con **numero riga e nickname**: un valore non valido blocca il salvataggio e mostra esattamente il motivo.
- Compatibilità UI `CONTROL` / `CONTROLLO`: CONTROL sul database è ancora il primo valore tentato. Se un CHECK/enum della modalità rifiuta esplicitamente CONTROL, si ritenta una sola volta `CONTROLLO`, solo dopo il rifiuto (nessun doppio INSERT a seguito di un salvataggio riuscito).
- ID partita registrato immediatamente dopo la risposta positiva Supabase, prima delle statistiche: protegge da duplicati in caso di errore successivo.
- Errori sulle righe statistiche, screenshot/log e classifiche evidenziati come **salvataggio parziale**, non nascosti dietro una conferma generica.
- Errori di aggiornamento evento collegato e ricaricamento lista non possono più far dichiarare erroneamente fallito il salvataggio della partita già persistita.
- Errore caricamento screenshot non più ignorato: viene mostrato prima di salvare la partita.
- SQL di diagnosi in `supabase/DIAGNOSTICA_FIX7_CONTROLLO_SOLO_LETTURA.sql` (SOLO SELECT; facoltativo).

## Installazione
Sostituire `app/import/match/page.tsx` con quello presente nella PATCH; non occorrono SQL/migrazioni per FIX7.

```powershell
cd "C:\\PERCORSO\\CLAN_MANAGER_AK47DX"
npm ci --legacy-peer-deps
npm run build
git add -A
git commit -m "AK47DX V14.1 FIX7 diagnostica salvataggio Controllo"
git push origin main
```

**Non effettuare il push se `npm run build` fallisce.** La build completa non è stata verificata in quest'ambiente, per indisponibilità delle dipendenze npm.

## Collaudo senza duplicati
1. Aprire **Importa partita**, selezionare Controllo e compilare almeno una riga giocatore con dati reali.
2. Verificare i tempi `mm:ss` o lasciare vuoto.
3. Premere Salva una volta sola e guardare il messaggio **sotto** il pulsante.
4. **Successo**: partita + righe confermate. **Avviso parziale**: partita già registrata, controllare le righe in Archivio. **Errore**: nessuna conferma database, copiare il messaggio visualizzato.
5. Se esiste un record con la stessa data/punteggio in Archivio, non crearne un secondo: scegliere Modifica partita già registrata.
6. Se il messaggio contiene `23514`, consultare la query SELECT allegata per identificare il vincolo, senza fare modifiche al database.

## Verifiche
Sorgente testato con parser TypeScript locale e revisione statica del flusso. Nessuna prova diretta su Supabase di produzione; FIX7 è una **versione TEST**, non una garanzia di correzione della configurazione del database.
