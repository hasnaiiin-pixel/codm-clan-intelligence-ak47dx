# AK47DX Clan Manager V14.2 TEST FIX18 — Mappe, torneo armi, totale stagioni, rigenerazione

## Perché sul sito mancavano le modifiche
- Nei log condivisi dall'utente, l'ultimo push `main` confermato era FIX15 (`192e4bd`): FIX16/FIX17 nei file ZIP non diventano automaticamente un deployment Vercel.
- La pagina principale `/tournament`, tab «Regole / Armi», utilizzava un elenco statico di **27 mappe**, diverso dalle 75 del catalogo FIX17 in «Tabelloni 64».
- La pagina `/version` mostrava ancora un marker V13.11.2.
- FIX16 aveva già il calcolo delle Scrim globali ma non era stato possibile verificare che fosse online.

## Modifiche FIX18
1. `/tournament`: **75 mappe** dal catalogo unico `src/lib/codmTournamentCatalog.ts`, comprese Saloon, King, **Gulag Showers (Gulag)**, Stack, Killhouse, Cage. Ricerca, seleziona tutto e deseleziona tutto. Le mappe sono nel catalogo, non automaticamente ammesse a ogni modalità. Per i bracket 64 lo staff conferma i pool per singola modalità.
2. `/tournament` → `Mappe / Torneo armi`: 9 categorie con armi specifiche selezionabili, seleziona/deseleziona categoria; salva nel vecchio campo JSON `rules.allowed_weapons`. Durante la generazione di nuove partite legacy viene sorteggiata un'arma fra quelle selezionate, registrandola nelle note dell'incontro; nelle partite del bracket 64 resta disponibile anche il selettore dedicato per ogni match e Grand Final.
3. `/tournament` → `Crea / Gestisci`: **Rigenera torneo da iscritti**. Richiede digitazione `RIGENERA`, duplica il torneo in una nuova edizione, copia gli iscritti e, facoltativamente, le squadre. Riparte senza match né risultati; l'edizione originale non viene cancellata. Non duplica i dati individuali di produzione. Se la copia fallisce dopo la creazione della nuova edizione, la nuova edizione può restare parziale: controllare prima di riprovare.
4. `/analytics`: **Somma TUTTE LE STAGIONI** in una riga esplicita: Scrim, vinte, perse, pareggiate, WR, vecchie, nuove, partite. Pulsanti di reset filtri e ricarica dati Supabase, e contatore risultati caricati. Da FIX16: ogni vecchio risultato e' una Scrim; le nuove partite per clan+stagione entro 24h formano una Scrim; non duplicare serie storiche dettagliate. Le statistiche individuali sono derivate soltanto da partite che le contengono.
5. `/version`: marker `AK47DX_V14_2_FIX18_MAPPE_ARMI_STATISTICHE_RIGENERA`, da usare come controllo del deployment effettivo.

## Installazione patch sulla FIX17 (o build completa senza altre modifiche locali)
1. **Fai backup** del repository e controlla l'ultima versione funzionante; non copiare la patch sopra una V13 o una V14 non aggiornata.
2. Estrai lo ZIP patch dalla radice del progetto Git, preservando `app`, `src`, `tests`. Per la build completa estrai in una cartella pulita, poi usa il tuo repository Git corretto.
3. Prompt dei comandi Windows:

```cmd
cd C:\Users\spea4060_tmv331ef\Documents\PROGETTI\COD\CODM_CLAN_INTELLIGENCE_2_0_DEPLOYABLE_PWA_YOLO_AK47DX
npm ci --legacy-peer-deps
npm run test:bracket64
npm run test:fix18
npm run build
```

4. **Solo se il build e i test riescono:**

```cmd
git add -A
git commit -m "AK47DX V14.2 FIX18 catalogo mappe armi statistiche rigenerazione"
git push origin main
```

5. Su Vercel controlla che il progetto segua `main` (ambiente Production) e che il deployment punti al nuovo commit. Se i trigger automatici non funzionano, crea un deployment manuale del commit appena pubblicato. `git push` da solo non garantisce che Vercel abbia effettivamente distribuito la build.
6. Apri **`https://TUO-DOMINIO/version`**: deve riportare esattamente `AK47DX_V14_2_FIX18_MAPPE_ARMI_STATISTICHE_RIGENERA`. Se leggi ancora V13, FIX15/16 o non compare il marker, non stai vedendo la nuova build. Verifica deployment e service worker PWA in `/cache-reset`, poi ricarica.
7. Test a mano con il tuo Supabase: in Tornei > Mappe / Torneo armi cerca Saloon, King, Gulag, Stack, Killhouse, Cage; seleziona armi, salva, genera un torneo **di prova**. In Tornei > Gestisci > Rigenera verifica nuova edizione, vecchi risultati intatti. In Statistiche > Tutte le stagioni verifica che la riga Σ coincida con la somma per stagione e che sia presente la stagione storica.

## Note di compatibilità
- Nessuna nuova migrazione SQL FIX18.
- Il motore bracket FIX17 continua a produrre N-1 serie Winners + N-3 Losers + 1 Grand Final BO3, escludendo BYE. FIX18 non ha cambiato quel motore.
- Non esportare la FIX18 come Official Stable finché test di Next.js, deploy Vercel e Supabase reali non sono stati verificati sul proprio ambiente.
- Una Scrim storica è un risultato di serie, non cinque partite individuali inventate.

## Test eseguiti in ambiente di preparazione
- Script FIX17: 104 configurazioni, esito OK.
- Test FIX16 Scrim 24h: 7/7 OK.
- Test FIX15 riepilogo stagioni: 5/5 OK.
- Nuovo controllo FIX18: catalogo mappe, categorie armi, collegamento UI, duplicazione iscritti e totale stagioni: OK.
- Parse/traspilazione degli 81 file TS/TSX: nessun errore sintattico.
- **Build Next.js completa NON certificata** in ambiente di preparazione (dipendenze npm non installate qui). Eseguire `npm run build` sul PC con `node_modules` presente prima del push.
