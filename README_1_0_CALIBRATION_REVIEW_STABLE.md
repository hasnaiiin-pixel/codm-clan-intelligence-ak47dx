# 1.0 Calibration Review Stable

Release dedicata a stabilizzare il flusso import partita dopo i problemi di OCR su punteggio player e impatto.

## Decisione

Punteggio player e impatto vengono tolti dall'import automatico. L'app salva solo Kill / Death / Assist per le statistiche giocatore.

## Perché

Tesseract confondeva ancora molti numeri su punteggio player e impatto. Importarli avrebbe creato storico falso. Meglio avere meno campi ma affidabili.

## Cosa resta salvato

- screenshot originale come prova
- note partita
- risultato nostro team
- squadra vincente blu/rosso
- score team blu/rosso
- mappa e modalità
- data/ora OCR
- classifica 1–5 team vincente e perdente
- MVP vincente/perdente
- Kill / Death / Assist
- nickname OCR/manuale

## UI

- menu con icone
- bottoni moderni
- tabelle semplificate
- anteprima KDA-only
- messaggi più chiari quando OCR richiede revisione
