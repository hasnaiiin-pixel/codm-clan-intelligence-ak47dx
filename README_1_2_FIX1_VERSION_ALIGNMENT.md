# CODM Clan Intelligence 1.2 FIX1 - Version Alignment

Correzione rapida per il problema segnalato:

```text
Backend OCR Hybrid 1.1 non raggiungibile o non allineato
versione trovata: 1.2.0-supabase-analytics-stable
versione attesa: 1.1.0-profile-roster-stable
```

## Cosa è stato corretto

- Import Match ora si aspetta backend `1.2.0-supabase-analytics-stable`.
- Import Profile ora si aspetta backend `1.2.0-supabase-analytics-stable`.
- Messaggi UI aggiornati da 1.1/1.0 a 1.2.
- Default `engine_version` nei modelli Python allineato a 1.2.

## Verifica

Aprire:

```text
http://127.0.0.1:8780/health
```

Deve rispondere:

```json
"version": "1.2.0-supabase-analytics-stable"
```

Poi in `/import/match` il controllo backend non deve più bloccare con versione attesa 1.1.

## Avvio consigliato

Chiudere finestre backend/frontend vecchie, poi:

```bat
setup_ocr_backend.bat
npm.cmd install
start_all.bat
```
