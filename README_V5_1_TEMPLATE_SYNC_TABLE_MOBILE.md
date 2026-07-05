# CODM AK47DX V5.1 — Template Sync + Mobile Table definitivo

Questa versione corregge il problema operativo segnalato: in calibrazione il template è corretto, ma in import sembrava diverso o incompleto.

## Fix principali
- Import mostra sempre l'overlay locale completo del template salvato.
- I riquadri sottili sono il template salvato/localStorage, i riquadri spessi sono quelli realmente letti dal backend.
- Import seleziona automaticamente il miglior template salvato, non il default se esiste un template utente.
- /cache-reset non cancella più i template OCR salvati.
- La tabella sotto su telefono diventa card verticali, quindi non serve scorrere lateralmente per vedere Score/Kill/Death/Assist.
- Backend OCR resta 2.0.8 V5.0 stabile. Non è necessario aggiornare Render se /health mostra già 2.0.8.

## Marker frontend
V5_1_TEMPLATE_SYNC_TABLE_MOBILE_OK

## Backend OCR accettato
2.0.8-v5-0-import-score-kda-definitivo-ak47dx
