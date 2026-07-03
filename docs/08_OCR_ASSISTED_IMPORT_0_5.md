# CODM Clan Intelligence — MVP 0.5 Assisted OCR Import

## Perché questa versione

La versione 0.4 migliorava i ritagli OCR, ma COD Mobile usa font piccoli, nickname con simboli, avatar, icone rank e colonne molto ravvicinate. Per questo la sola lettura automatica non basta.

La 0.5 cambia strategia: l'import non dipende più dal nickname letto perfettamente. La tabella viene sempre divisa in Team Blu e Team Rosso, e per ogni riga del Team Blu puoi scegliere il player dal roster.

## Novità principali

- Risultato partita letto da area dedicata VITTORIA/SCONFITTA + punteggio blu:rosso.
- Modalità e mappa lette dalla riga sotto il risultato.
- Team Blu e Team Rosso sempre separati.
- Creazione automatica di 5 righe Blu + 5 righe Rosse anche se OCR non legge tutto.
- Colonna “Player roster” per associare la riga al giocatore corretto.
- Le statistiche vengono salvate sul player selezionato, non sul nickname OCR casuale.
- K/D/A più rigido: cerca pattern tipo 10/9/1 oppure tre gruppi numerici vicini.
- Score, impatto, tempo e catturate filtrati con range plausibili.
- Team rosso archiviato nel raw import, ma non viene inserito nel roster.
- Import type corretto a `scoreboard`, compatibile con la migrazione 0.2.

## Flusso corretto

1. Apri `/import/match`.
2. Carica screenshot scoreboard.
3. Clicca “Leggi scoreboard con OCR assistito 0.5”.
4. Controlla risultato, modalità, mappa e score blu/rosso.
5. Per ogni riga blu seleziona il player corretto dal menu “Player roster”.
6. Correggi K, D, A, score, impatto, tempo/catturate se necessario.
7. Salva.

## Nota importante

Se CODM non legge bene un nickname con simboli, non è più un blocco: scegli il player dal roster e salva comunque le statistiche.
