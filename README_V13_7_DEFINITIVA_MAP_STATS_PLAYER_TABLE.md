# CLAN MANAGER AK47DX V13.7 DEFINITIVA

Base: V13.6 funzionante.

## Modifiche
- Tabella Giocatori riorganizzata in 9 colonne compatte: Player, Clan, Account, Partite, Vittorie/WR%, Kill-Death-Assist/KD, Medaglie/posizione media, associazione email, modifica player.
- Tutte le azioni restano disponibili: associa email, modifica nome, modifica clan, apertura profilo personale.
- Migliori giocatori per mappa aggiunti in Statistiche.
- Classifica Top 5 per ogni mappa con Partite, W/WR, Kill/Death/Assist, K/D, MVP e posizione media.
- Il migliore per mappa usa un punteggio bilanciato e, quando possibile, richiede almeno 2 partite per ridurre risultati falsati da una singola partita.
- K/D/A resta sempre Kill / Death / Assist.

## Installazione e deploy
```bash
cd cartella-progetto
npm ci --legacy-peer-deps
npm run build
git add -A
git commit -m "V13.7 definitiva statistiche mappe e tabella giocatori"
git push origin main
```

## Verifica
- Aprire Statistiche e controllare la sezione "Migliori giocatori per mappa".
- Aprire Giocatori e verificare associazione email, modifica nome, modifica clan e profilo cliccabile.
- Controllare che Partite indichi partite uniche e K/D/A mantenga Kill, Death, Assist.

Non serve nuovo SQL Supabase per questa versione.
