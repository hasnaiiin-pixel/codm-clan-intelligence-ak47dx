# 0.9E — Correzioni tecniche

## Problemi risolti

- OCR numerico: `numeric_ocr_candidates` ora esegue veramente tutte le varianti `gray/sharp/binary/inverted` con scale multiple.
- Template spostato: aggiunta modalità `table_lock` che usa solo le due tabelle calibrate come ancora principale.
- Score CED: i box score singoli non sovrascrivono più lo score se la confidenza è bassa.
- WIN/LOSE ambiguo: aggiunti `winning_team` e `our_team` nel JSON backend.

## Nuovi campi JSON scoreboard

```json
{
  "result": "WIN",
  "winning_team": "blue",
  "our_team": "blue",
  "blue_score": 6,
  "red_score": 0
}
```

`result` è l'esito del nostro team; `winning_team` indica quale lato dello screenshot ha vinto.
