# CODM AK47DX V6.5 — Events Import BAN Persist Flow

## Modifiche principali

- Lista mappe CODM precompilata nell'editor partita.
- Tipologia round/punteggio con preset: Punteggio round, Punteggio, Kill, BO3, BO5, BR.
- BAN partita da lista selezionabile con chip + aggiunta manuale.
- Score, esito e MVP non vengono più compilati manualmente nell'evento: arrivano da Importa partita.
- Importa partita da Eventi apre `/import/match?event=...&round=...` con banner chiaro, modalità/mappa/avversario già caricati.
- Salvataggio import aggiorna automaticamente l'evento collegato: stato `Risultato caricato`, score, esito e MVP.
- Possibilità di modificare evento esistente, duplicarlo per crearne uno nuovo, e aprire evento dal calendario.
- Riepilogo eventi ordinato per: Partita, dettagli, orari, convocati, BAN, risultato.
- Badge stato partita visibili nel riepilogo.
- Card eventi superiori leggermente ridotte in altezza.
- Bozza editor salvata localmente per evitare perdita dati quando si cambia tab Chrome o si apre una cartella sul PC.

## Verifica

Comandi consigliati:

```powershell
npm ci --legacy-peer-deps
npm run build
```

Nel sandbox la build arriva a:

- `Compiled successfully`
- `Generating static pages (32/32)`

poi può restare lunga in `Collecting build traces` per limite ambiente.
