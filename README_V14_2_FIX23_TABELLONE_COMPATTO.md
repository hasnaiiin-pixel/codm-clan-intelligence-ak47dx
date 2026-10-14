# AK47DX V14.2 FIX23 TEST — Tabellone panoramico compatto

## Modifiche
- Da FIX22, senza cambiare codici o dati già persistiti su Supabase.
- Un unico tabellone: Winners in alto, Losers in basso e Grand Final all'estrema destra.
- Frecce reali SVG basate sui collegamenti del motore. Vincente blu, perdente arancione, ingresso Grand Final oro.
- Incontri abbreviati come W1, W2, L1, L2, GF in tabellone, calendario, routing e tabella delle qualificazioni. Gli ID tecnici originali restano invariati nel database.
- Card più piccole, con squadra in grassetto, giocatori sotto piccoli e regolari, VS perfettamente centrato, mappa/arma/ora e punteggi centrati.
- Due viste integrate: **Panoramica completa**, adattata alla larghezza/altezza, e **Dettaglio leggibile** da scorrere. Con 32–64 squadre i testi nella panoramica possono diventare piccoli: usa Dettaglio per leggere e modificare ogni incontro. Non è tecnicamente possibile mostrare 125 incontri tutti leggibili contemporaneamente su un telefono.
- Classifiche gironi compattate senza scroll orizzontale, con troncamento dei nomi molto lunghi se necessario.
- Calendario e pagina risultati uniformati, senza modificare i valori storici.
- `/version` aggiornata al marker `AK47DX_V14_2_FIX23_COMPACT_UNIFIED_BRACKET`.

## Sicurezza dei dati
Non elimina incontri, risultati, iscritti, squadre e tornei. Non sono necessarie nuove query SQL per queste modifiche grafiche. Il fix SQL della colonna score_limit (FIX20) resta necessario se non ancora applicato.

## Applicazione PATCH sulla FIX22
1. Chiudi l'app locale e fai una copia di sicurezza della cartella.
2. Estrai i file della PATCH direttamente nella directory principale del progetto, **sovrascrivendo** i file con gli stessi percorsi (es. `app/tournament/BracketFlowBoard.tsx`).
3. Conserva `.git` ed `.env.local`. Non eliminare `node_modules`.
4. Dalla cartella del progetto esegui:

```cmd
npm run test:bracket64
npm run test:fix18
npm run test:fix19
npm run test:fix22
npm run test:fix23
npm run build
```

Se i controlli completano correttamente:

```cmd
git add -A
git commit -m "AK47DX V14.2 FIX23 tabellone compatto unificato"
git push origin main
```

Verifica il deployment Production su Vercel e `/version`. Se la PWA mostra vecchi file, apri `/cache-reset`.

## Test eseguiti qui
- `test:bracket64`: 104 casi superati.
- `test:fix18`: superato.
- `test:fix19`: superato.
- `test:fix22`: superato.
- `test:fix23`: simulazione layout 8, 16, 24, 32 e 64 squadre, codici brevi e centrature, superata.
- Compilazione Next.js completa in questo ambiente: **non certificata** perché l'installazione `npm ci` nell'ambiente di generazione è rimasta bloccata. Esegui `npm run build` sul computer dove le dipendenze sono già installate; non lanciare npm ci inutilmente.
