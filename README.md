# CODM Clan Intelligence AK47DX — V4 allineata

Versione consolidata per Vercel + Supabase + Telegram + OCR Hybrid 2.0.

## Cosa contiene

- Dashboard pubblica in sola lettura.
- Login e registrazione email con nome, nickname CODM e UID opzionale.
- Nuovi utenti visibili in `/admin/users` dopo SQL V4 e conferma/login.
- Permessi: visitor/registered/viewer/player/staff/coach/owner.
- Pagine operative protette per Staff, Coach e Owner.
- Sidebar mobile laterale a scomparsa.
- Calendario eventi `/events` con link Google Calendar.
- API Telegram reminder `/api/telegram/reminders` per messaggi 2h e 10m prima.
- Pagina `/ocr-status` per controllare OCR backend pubblico/locale.

## Comandi locali

```bat
npm ci --legacy-peer-deps
npm run build
npm run dev
```

## Supabase

Eseguire in ordine le migrazioni storiche se non già eseguite, poi la migrazione V4:

```txt
supabase/schema.sql
supabase/migration_2_0_definitive_ak47dx.sql
supabase/migration_2_0_deployable_pwa_yolo_ak47dx.sql
supabase/06_auth_events_telegram_ocr_v4.sql
```

## Vercel Environment Variables

Obbligatorie:

```txt
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
NEXT_PUBLIC_APP_URL
SUPABASE_SERVICE_ROLE_KEY
TELEGRAM_BOT_TOKEN
TELEGRAM_CHAT_ID
CRON_SECRET
```

Opzionale OCR:

```txt
NEXT_PUBLIC_OCR_BACKEND_URL
```

## Supabase Auth Redirect

In Supabase → Authentication → URL Configuration:

```txt
Site URL = https://TUO-LINK-VERCEL.vercel.app
Redirect URLs:
https://TUO-LINK-VERCEL.vercel.app/**
http://localhost:3000/**
```

## Test dopo deploy

- `/version`
- `/cache-reset`
- `/login`
- `/admin/users`
- `/events`
- `/ocr-status`
- `/api/telegram/reminders?secret=CRON_SECRET`

