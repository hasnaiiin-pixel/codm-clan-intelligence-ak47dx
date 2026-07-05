# CODM AK47DX V4.5 - Import veloce, eventi avanzati e reminder multipli

Questa versione si concentra sui problemi importanti segnalati:

- import risultati online su Render che andava in timeout;
- scelta nostro team BLU/ROSSO prima dell'import e possibilità di rianalizzare cambiando team;
- salvataggio solo statistiche del nostro clan/team;
- eventi cancellabili;
- reminder Telegram multipli configurabili per evento;
- messaggio Telegram personalizzabile;
- note evento;
- admin/users con email/nome/nickname/UID.

## Backend OCR

Render deve essere aggiornato con la cartella `ocr-backend` di questa versione.
Dopo deploy Render verifica:

```txt
https://ak47dx-ocr-backend.onrender.com/health
```

La versione attesa è:

```txt
2.0.4-v4-5-fast-ownteam-ak47dx
```

La modalità OCR usata online è ora FAST: massimo poche chiamate Tesseract, solo nostro team, niente statistiche avversari.

## SQL Supabase

Esegui in Supabase SQL Editor:

```txt
supabase/06_auth_events_telegram_ocr_v4.sql
```

## Frontend Vercel

Variabili richieste:

```txt
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
NEXT_PUBLIC_APP_URL
SUPABASE_SERVICE_ROLE_KEY
TELEGRAM_BOT_TOKEN
TELEGRAM_CHAT_ID
CRON_SECRET
NEXT_PUBLIC_OCR_BACKEND_URL=https://ak47dx-ocr-backend.onrender.com
```

## Test

- `/version` deve mostrare `V4_5_IMPORT_FAST_EVENTS_REMINDERS_OK`.
- `/ocr-status` deve vedere backend OCR 2.0.4.
- `/import/match` deve importare entro pochi secondi/minuti, non fermarsi a 86% per 180 secondi.
- `/events` permette cancellazione eventi, reminder multipli e template Telegram.
- `/api/telegram/test?secret=...` manda test immediato.
- `/api/telegram/reminders?secret=...` controlla reminder.
