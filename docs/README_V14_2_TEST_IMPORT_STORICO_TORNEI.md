# CODM AK47DX V14.2 TEST — risultati storici e Tournament Center

## NOVITÀ
- `Importa risultati storici`: XLSX/CSV, foglio `RISULTATI_STORICI`, anteprima tabella e schede modificabili, gruppi di 100 record fino a 1000, controllo elenco clan dello stesso clan AK47DX senza duplicare il nome per differenze maiuscole/minuscole; suggerimenti per clan già incontrati. La deduplica risultati usa `ID_RISULTATO`/nome file+riga; **incontri diversi contro lo stesso clan sono consentiti**. I file reimportati sono rifiutati se hanno la stessa chiave.
- Per risultati finali Scrim usare `LIVELLO=SERIE`, non `SINGOLA`. La modalità non nota va impostata `ALTRO` senza inventare la mappa.
- Scegli una stagione STORICA già creata da Admin; **la stagione attiva non viene toccata**. Esito derivato automaticamente dal punteggio. Le serie sono contate come incontri, non come partite individuali; KDA/MVP non inventati.
- Tornei: regolamento con modalità attive, mappe sorteggiabili, limiti punteggio per modalità, numero di lobby (1–4), slot di calendario (10–180 min). Configurazione registrata nei `rules` del torneo. Sorteggio casuale delle mappe/modalità SOLO tra quelle consentite; gli incontri generati vengono salvati, NON rigenerati sopra incontri esistenti.
- Calendario torneo: giorno, ora, lobby, nomi giocatori accanto a nomi squadre e risultati.
- Gironi più compatti (G/V/N/Diff/Pt); tabellone e calendari mostrano giocatori delle squadre tra parentesi; prospetti qualificati/eliminati sotto il tabellone e avanzamento turno successivo.

## PRIMA DEL DEPLOY
1. Backup recente Supabase e sorgente Git.
2. Aprire **Supabase → SQL Editor** sul database AK47DX e applicare `supabase/UPDATE_V14_2_TOURNAMENT_SCORE_LIMIT_NON_DESTRUCTIVE.sql`. NON eseguire lo script di reset, NON eseguire `FINAL_SCHEMA`.
3. Controllare il risultato del `SELECT` per `score_limit`. Questo SQL preserva le righe esistenti e amplia il vincolo modalità per consentire ALTRO/CONTROL.
4. Sostituire i file del progetto con quelli del ZIP (senza cancellare `.env.local` e senza copiare vecchi node_modules).
5. Sul PC Windows: `cd "C:\PERCORSO\CLAN_MANAGER_AK47DX"` poi `npm ci --legacy-peer-deps` e `npm run build`. Se il build termina correttamente: `git add -A`, `git commit -m "AK47DX V14.2 TEST import storico e tornei"`, `git push origin main`.
6. Vercel esegue il deploy da main: verificare lo stato verde del build.

## ESEMPIO DI IMPORT
Il sito offre il template `public/templates/AK47DX_V14_2_RISULTATI_STORICI.xlsx` con foglio VUOTO `RISULTATI_STORICI`, guida e esempi in foglio distinto **NON DA IMPORTARE**.
Formato riga: `ID_RISULTATO`, `DATA` (AAAA-MM-GG), `STAGIONE` (nome storico già creato), `CLAN_AVVERSARIO`, `MODALITA` (CED/POSTAZIONE/DOMINIO/CONTROLLO/ALTRO), `MAPPA` facoltativa, `PUNTEGGIO_AK47DX`, `PUNTEGGIO_AVVERSARIO`, `LIVELLO` (SERIE/SINGOLA), `GIOCATORI`, `NOTE`, `FOTO_URL`.

## VERIFICHE
- Importare una scrim 2–1 in stagione storica e ripetere contro lo stesso clan con data diversa: devono risultare DUE incontri, UN solo nome clan normalizzato.
- Reimportare lo STESSO file: il server deve impedire duplicati con chiavi già inserite. Se fallisce un batch, le righe non salvate rimangono nella pagina; non ripetere quelle già confermate.
- Verificare che le statistiche storiche mostrino il Win Rate degli incontri e NON inventino K/D/A.
- Nel torneo creare squadre 2v2 con nomi e membri, aprire Regole, scegliere 1–2 modalità e 2–3 mappe, impostare limite, salvare torneo, generare gironi (solo se nessun incontro esistente), verificare calendario, nomi, limite e tabellone.
- Inserire punteggi dei gironi; verificare classifica G/V/N/Diff/Pt, colorazione qualificate/eliminate, prospetto avanzamenti e playoff.
- Su smartphone controllare tabella gironi compatta e scorrimento orizzontale tabellone.

## LIMITI VERIFICATI / NON VERIFICATI
Sono stati controllati sintassi TypeScript/TSX, struttura file e archivio ZIP. **Non è stato possibile fare il build Next.js completo** nel container (npm registry EAI_AGAIN) e NON è stato testato su Supabase di produzione. Versione TEST, non Stable.
Le impostazioni nuove richiedono la migrazione SQL per `score_limit`, e sono applicate agli incontri che si generano DOPO l'aggiornamento. Le vecchie partite possono avere `score_limit = NULL`.
