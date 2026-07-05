# CODM AK47DX V5.3 - Import no-abort + template + tabella mobile

Questa versione corregge il blocco `signal is aborted without reason` quando Render è lento in `/health`.

## Cosa cambia

- `/health` attende fino a 90 secondi.
- Se `/health` è lento ma URL Render è configurato, l'import prova direttamente `/ocr/scoreboard/ced`.
- Timeout import portato a 240 secondi.
- Backend OCR da usare resta `2.0.9-v5-2-template-kda-table-definitivo-ak47dx`.
- Template inviato come `saved_canonical_template_v5_3`.
- Tabella import forzata a larghezza piena/card mobile.

## Test

1. `/version` deve mostrare `V5_3_IMPORT_NO_ABORT_TEMPLATE_TABLE_OK`.
2. `/ocr-status` deve accettare backend `2.0.9-v5-2-template-kda-table-definitivo-ak47dx`.
3. `/calibration` salva template una volta.
4. `/import/match` importa partita.
