# AK47DX V14.1 FIX5 — Import risultati modalità Controllo

## Problema osservato
Nell'importatore Risultati Storici funzionano CED, Postazione e Dominio, ma il salvataggio di Controllo viene rifiutato.

## Modifica
- Il selettore continua a mostrare **CONTROLLO**, ma il backend archivia **CONTROL**, codice gia' presente nel catalogo SQL originale (`supabase/FINAL_SCHEMA_CLAN_MANAGER.sql`) e usato in Eventi e Tornei.
- Accetta sia CONTROLLO sia CONTROL dalle importazioni Excel e dagli altri client.
- Statistiche e Archivio visualizzano **Controllo** e accorpano entrambi i codici nei filtri senza modificare i record esistenti.
- Anche Importa Partita (con K/D/A) usa lo stesso codice persistito.
- Gli errori di Supabase durante l'import storico mostrano ora il codice database per individuare ulteriori problemi.
- FIX5 BUILD completa comprende il modello Excel della FIX4.

**Migrazioni SQL:** nessuna per questa correzione. Nessun UPDATE/DELETE dei record storici.

## Test consigliati
1. Prova una sola partita Controllo nella schermata Importa > Risultati storici scegliendo una stagione storica, clan avversario e 3-1.
2. Verifica Archivio Partite filtrando Modalità=Controllo, in Carriera o nella stagione storica.
3. Verifica Statistiche in Carriera e per stagione/modalità.
4. Importa una partita Postazione/DOMINIO/CED per test regressivo.
5. Se appare ancora errore, annota il messaggio Supabase completo e il codice tra parentesi: potrebbe esserci un vincolo personalizzato assente dal sorgente SQL disponibile.

## Note compilazione
L'integrita' ZIP e i controlli statici sono stati eseguiti. La `next build` completa non e' certificata in questo ambiente senza dipendenze npm installate.

## Deploy Git / Vercel

```powershell
cd "C:\PERCORSO\CLAN_MANAGER_AK47DX"
npm ci --legacy-peer-deps
npm run build
git add -A
git commit -m "AK47DX V14.1 FIX5 Control risultato storico"
git push origin main
```
