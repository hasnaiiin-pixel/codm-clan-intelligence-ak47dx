# CODM AK47DX V6.4 - Eventi ordinati + Calibrazione template flow

Build preparata partendo da `CODM_AK47DX_V6_3_EVENT_PLANNER_TEMPLATE_FIX_READY.zip`.

## Controllo eseguito
- `npm ci --legacy-peer-deps` OK.
- `npm run build` ha compilato correttamente e generato 32/32 pagine. Nel sandbox il processo è rimasto appeso dopo la stampa finale di Next, quindi l'ho considerato compilato ma da verificare anche su Vercel/PC reale.

## Cambi principali V6.4
- Pagina Eventi riorganizzata: **Eventi da fare** in alto, calendario sotto, editor evento/partite in basso.
- Sezione partite rifatta: ogni partita è una card verticale ordinata, non più compressa in una riga.
- Pulsanti chiari: `+ Aggiungi partita` e `- Togli ultima partita`; ogni card ha anche `Elimina`.
- Stato partita separato dall'esito:
  - stato: `Da giocare`, `Giocata`, `Risultato caricato`;
  - esito automatico: `Vinto`, `Perso`, `Pareggiato` calcolato dagli score.
- Formazione titolare e riserve per ogni partita selezionabili dai giocatori registrati nell'app, con chip/badge.
- Tipologia partita con simboli stile CODM: CED, Postazione, Dominio, Control, Death Match, Prima Linea, TDM, BR, Scrim.
- Telegram: aggiunto placeholder `{match_details}` e generazione dettagliata di Partita 1, Partita 2, Partita 3 ecc. con modalità, mappa, orari, roster, BAN, stato, esito e MVP.
- API Telegram aggiornata per leggere il piano evento salvato in `event_notes` e renderizzare `{match_details}`.
- Calibrazione: `Tipologia telefono` non riscrive più `default` quando viene cancellata.
- Calibrazione: rimosso campo `Descrizione opzionale`.
- Calibrazione: aggiunta scelta esplicita `Origine template`: default generale, tipologia telefono, template salvato per nome.
- Flusso template reso più chiaro per salvataggio/caricamento/import.

## Comandi consigliati
```bash
npm ci --legacy-peer-deps
npm run build
npm run dev
```

## Commit suggerito
```bash
git add -A
git commit -m "feat: CODM v6.4 events ordered calibration template flow"
git push origin main
```
