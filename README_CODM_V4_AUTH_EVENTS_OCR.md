# CODM AK47DX V4 — Auth, eventi, permessi, OCR, Telegram

## Cosa include
- Login/registrazione rifatti graficamente.
- Registrazione con email, nome, nickname CODM e UID opzionale.
- Conferma email verso `/auth/callback` e poi `/profile-import`.
- Nuovi account subito visibili in `/admin/users` come pending.
- Gestione ruoli da admin: viewer, player, staff, coach, owner.
- Pagina `/events` per scrim/eventi con link Google Calendar.
- API `/api/telegram/reminders` per inviare reminder Telegram 2 ore e 10 minuti prima.
- Pagina `/ocr-status` per controllare backend OCR Hybrid 2.0.
- Fix OCR: su Vercel non prova più 127.0.0.1 se non hai impostato `NEXT_PUBLIC_OCR_BACKEND_URL`.

## Installazione
1. Estrai tutto lo ZIP nella root del progetto.
2. Esegui `APPLICA_CODM_V4_AUTH_EVENTS_OCR.bat`.
3. In Supabase SQL Editor esegui `supabase/06_auth_events_telegram_ocr_v4.sql`.
4. Commit e push:

```bat
git add -A
git commit -m "feat: CODM v4 auth events OCR telegram"
git push origin main
```

## Variabili Vercel necessarie
Frontend:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_APP_URL`
- `NEXT_PUBLIC_OCR_BACKEND_URL` = URL pubblico backend OCR, esempio Render/Cloud Run. Non usare 127.0.0.1 su Vercel.

Server Telegram:
- `SUPABASE_SERVICE_ROLE_KEY`
- `TELEGRAM_BOT_TOKEN`
- `TELEGRAM_CHAT_ID`
- opzionale `CRON_SECRET`

## Supabase redirect email
Supabase → Authentication → URL Configuration:
- Site URL: URL Vercel reale
- Redirect URLs:
  - `https://TUO-DOMINIO.vercel.app/**`
  - `http://localhost:3000/**`

## Reminder Telegram
Endpoint test:
`https://TUO-DOMINIO.vercel.app/api/telegram/reminders`

Se imposti `CRON_SECRET`, usa:
`https://TUO-DOMINIO.vercel.app/api/telegram/reminders?secret=IL_TUO_SECRET`

Per automatizzare ogni 10 minuti:
- Vercel Pro/Team: puoi configurare Cron Jobs frequenti.
- Vercel Hobby: cron frequenti possono non essere supportati; usa cron-job.org o UptimeRobot con URL + secret.

## Test
- `/login`: registrazione nuova email.
- `/auth/callback`: conferma email.
- `/admin/users`: nuovo utente pending e assegnazione ruolo.
- `/events`: creazione evento + Google Calendar.
- `/api/telegram/reminders`: invio reminder.
- `/ocr-status`: controllo OCR.
