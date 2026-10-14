# V13.9 – Grafici interattivi, filtri mappa/modalità, tabella player compatta

## Modifiche
- Grafici statistiche interattivi: clic su legenda/voce per mostrare etichetta, valore e percentuale.
- Tipo grafico selezionabile: Torta, Ciambella, Barre.
- Filtri Mappa e Modalità riportati anche direttamente sopra la classifica per mappa, con pulsante Azzera filtri.
- Tabella classifica: colonne Player e Clan ridotte.
- Tabella giocatori: larghezza totale ridotta; Account, Associa email e Modifica player più compatti.
- Email completa disponibile come tooltip del selettore; testo compatto nella cella.
- Stato sotto il player corretto: se esiste user_id mostra “Profilo account collegato”; non mostra più erroneamente “profilo CODM da collegare”.
- K/D/A invariato: Kill / Death / Assist.

## Database
Non serve nuovo SQL Supabase.

## Comandi
cd cartella-progetto
npm ci --legacy-peer-deps
npm run build
git add -A
git commit -m "V13.9 grafici interattivi filtri e tabella player compatta"
git push origin main
