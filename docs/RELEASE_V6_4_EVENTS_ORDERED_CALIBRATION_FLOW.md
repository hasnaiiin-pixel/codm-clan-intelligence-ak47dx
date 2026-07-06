# Release V6.4 - Eventi ordinati e template calibrazione

## Base di partenza
- File ricevuto: `CODM_AK47DX_V6_3_EVENT_PLANNER_TEMPLATE_FIX_READY.zip`.

## Modifiche Eventi
- Spostato il blocco **Eventi da fare** in alto.
- Calendario posizionato sotto gli eventi futuri.
- Editor evento spostato in basso e reso più largo/leggibile.
- Rifatta la sezione **Aggiungi/Togli partite**:
  - toolbar unica;
  - card verticale per ogni partita;
  - eliminazione per singola partita;
  - niente campi compressi in una sola riga.
- Stato partita separato da esito:
  - `Da giocare`;
  - `Giocata`;
  - `Risultato caricato`.
- Esito automatico da score:
  - `Vinto` se nostro score > avversario;
  - `Perso` se nostro score < avversario;
  - `Pareggiato` se score uguale.
- Formazione titolare e riserve selezionabili dai giocatori registrati nell'app.
- Tipologie partita con simboli CODM.
- BAN partita con icona e campo dedicato.
- Telegram: `{match_details}` genera Partita 1, Partita 2, Partita 3 ecc.

## Modifiche Calibrazione
- `Tipologia telefono` non forza più `default` quando l'utente cancella il campo.
- Rimosso campo `Descrizione opzionale`.
- Aggiunta scelta origine template:
  - Default generale;
  - Per tipologia telefono;
  - Nome template salvato.
- Flusso salvataggio/caricamento/import reso più chiaro.

## Verifica eseguita
- `npm ci --legacy-peer-deps`: OK.
- `npm run build`: compilazione OK, type-check OK, 32/32 pagine generate. Nel sandbox il comando resta appeso dopo la tabella finale di Next, quindi verificare anche su Vercel/PC reale con Node 24.x.
