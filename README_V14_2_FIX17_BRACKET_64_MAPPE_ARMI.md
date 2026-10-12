# AK47DX Clan Manager — V14.2 FIX17 TEST · Tabelloni fino a 64 + Mappe/Armi

## Nuova funzione

Dentro **Tornei → Tabelloni 64** c'è un generatore indipendente dai tabelloni precedenti, configurabile con:
- Da 5 a 64 **squadre qualificate**; 8/16/32/64 slot, formato minimo automatico oppure superiore scelto manualmente.
- Teste di serie (ordine manuale nominativo o sorteggio casuale).
- BYE automatici assegnati alle teste di serie alte; il BYE **non genera una partita** e non conta per le statistiche.
- Doppia eliminazione MODIFICATA: Winners W, Losers L, Grand Final BO3. Il perdente della Finale Winners viene eliminato; NON è previsto bracket reset né una seconda Grand Final.
- La formula delle SERIE effettive è W=N−1, L=N−3, Grand Final=1, totale=2N−3; per N=64: 63+61+1=125.
- I collegamenti vincente/perdente fra incontri sono conservati nel motore e mostrati come destinazioni nel tabellone e nel prospetto; il disegno dei connettori fra card è ancora semplificato.
- Catalogo: 75 mappe multiplayer CODM, 9 categorie di armi per 145 modelli. Gli elenchi sono modificabili dall'Admin, poiché il gioco viene aggiornato.
- Per OGNI modalità si selezionano le mappe effettivamente compatibili, poi categoria/armi permesse. Nessuna selezione implicita: la modalità/mappe/armi vengono controllate prima del sorteggio.
- Estrazione casuale o modifica manuale per incontro di modalità/mappa/arma, limite punteggio; calendario interno con data/ora.
- Grand Final BO3: tre mappe DIVERSE e un'arma configurabile per ciascuna delle tre partite; risultato 2–0, 2–1, 0–2 oppure 1–2.
- Schema e risultati del nuovo formato salvati nel campo JSONB `codm_tournaments.rules.advanced_bracket_v2`, già esistente nel progetto. **Non servono nuove migrazioni SQL.**

## Compatibilità e limiti di FIX17 TEST

- I tornei storici e le partite salvate in `codm_tournament_matches` NON sono modificati. Il nuovo generatore funziona in un nuovo torneo, oppure dopo gironi esistenti già completati senza playoff creati.
- Se un torneo ha già playoff del sistema precedente, crea un nuovo torneo per il formato 64.
- FIX17 mantiene lo storico delle partite del sistema precedente. I risultati inseriti in `Tabelloni 64` sono salvati nel campo JSON del torneo e visibili nel suo **calendario e tabellone interno**; l'integrazione degli stessi risultati con le tabelle legacy di statistiche globali e gli eventi Telegram rimane **da completare**, per evitare doppi conteggi.
- Il motore conserva i riferimenti fra vincitori e perdenti; i collegamenti grafici sono indicati tramite frecce/ID di destinazione, ma non c'è ancora un tracciato SVG completo che disegni una linea precisa fra ogni coppia di card.
- Il catalogo mappe CODM (fonte comunitaria aggiornata al periodo 2026) non garantisce che ogni mappa sia attiva in ogni playlist. Lo staff sceglie le combinazioni per modalità e può aggiungere mappe/armi non presenti.
- Lo stato e i risultati vengono aggiornati nel JSON del torneo. Non utilizzare due Admin contemporaneamente per modificare la stessa scheda; la pagina fa una verifica preventiva della revisione, ma non garantisce transazioni concorrenti atomiche sul JSON.
- FIX17 è TEST, non una Official Stable: non è stato possibile scaricare le dipendenze npm e lanciare una build completa Next.js in questo ambiente. Non pubblicare in produzione senza `npm run build` e test su un progetto Supabase di prova.

## Installazione PATCH sopra FIX16

1. Esegui backup del database PostgreSQL e Storage, conservando uno ZIP/sorgente funzionante del sito.
2. Estrai la PATCH FIX17 nella cartella principale del repository, mantenendo i percorsi. **Non eseguire script SQL di reset.**
3. Verifica la compilazione e il motore:

```powershell
cd "C:\PERCORSO\CLAN_MANAGER_AK47DX"
npm ci --legacy-peer-deps
npm run test:bracket64
npm run build
```

4. Solo se test e compilazione riescono:

```powershell
git add -A
git commit -m "AK47DX V14.2 FIX17 tabelloni 64 mappe e armi"
git push origin main
```

5. Controlla il deploy Vercel: se fallisce, usa il **primo** errore TypeScript o runtime, non i warning `deprecated`.

## Prova guidata sul sito

1. **Tornei → Crea/Gestisci:** crea un torneo TEST separato, aggiungi 11 o 23 squadre in **Squadre** o **Iscrizioni**.
2. Apri **Tabelloni 64**. Per 11 squadre il formato automatico è **Ottavi, 16 posti, 5 BYE**; prova manualmente anche un formato 32 posti.
3. Seleziona 3 o più mappe per la modalità preferita (es. CED), poi in **Categorie e armi** abilita una categoria/alcune armi.
4. Genera l'anteprima e controlla i conteggi: 10 Winners + 8 Losers + 1 Grand Final = **19** serie con 11 squadre.
5. Prima di salvare puoi scegliere **Modifica formato / Rigenera anteprima** senza toccare il database. Poi premi **Salva tabellone e configurazione**. Clicca una partita con due squadre già definite e inserisci il risultato; controlla l'avanzamento del vincitore nel W e del perdente nel L.
6. Completa i turni fino alla Finale Winners e alla Finale Losers; verifica che la sconfitta in Finale Winners comporti eliminazione.
7. Nella Grand Final verifica le tre mappe diverse, il risultato BO3 e il campione.
8. Dal tab **Calendario del nuovo tabellone** controlla giorno, ora, nickname, mappa, modalità, arma e risultato.
9. Non usare in contemporanea il vecchio pulsante Genera playoff su questo stesso torneo: una protezione ora lo blocca se esiste `advanced_bracket_v2`.

## Test locali effettuati

- Motore TypeScript isolato: `tsc --strict` superato.
- Componente nuovo: verifica TypeScript isolata con shim React superata.
- 104 simulazioni strutturali, N da 5 a 64, modalità auto e manuali; tutte terminano in una GF valida, senza incontri fittizi, conteggi W/L corretti.
- Esempi 11, 23, 37 e 53 inclusi nei test.
- Build completa Next.js NON verificata: npm registry non raggiungibile (`EAI_AGAIN`).

## Sorgenti catalogo
- https://www.callofduty.com/mobile
- https://callofduty.fandom.com/wiki/Call_of_Duty:_Mobile

**Non rinominare la build Official Stable fino a deploy e collaudo completi.**
