# CODM OCR ENGINE 0.3

Questa versione corregge il problema principale della 0.2: l'OCR generico su immagine intera non leggeva bene gli screenshot CODM.

## Cosa cambia

- Pre-processing canvas nel browser: scala immagine, contrasto, soglia bianco/nero e inversione testo bianco su sfondo scuro.
- Ritagli automatici per scoreboard: header, tabella team blu, tabella team rosso, 5 righe alleati, 5 righe nemici.
- Ritagli automatici per profilo: identità, UID/rank, pannello statistiche e numeri.
- Ritagli automatici per loadout/gunsmith: pannello destro, armi, statistiche arma e accessori.
- OCR bilingue `eng+ita`, utile per schermate CODM in italiano e inglese.
- Anteprime debug dei ritagli OCR, così si vede cosa sta leggendo davvero il motore.

## Procedura aggiornata

1. Apri `/import/profile`, `/import/match` o `/loadouts`.
2. Carica screenshot originale, non compresso se possibile.
3. Premi lettura OCR.
4. Aspetta che finisca: ora legge più zone separate, quindi può metterci più tempo.
5. Controlla i campi e correggi solo quello che resta sbagliato.
6. Salva.

## Nota

Anche con OCR 0.3, i nickname con simboli speciali possono richiedere correzione manuale. Il sistema però ora prova ad associare il nickname letto al roster esistente.
