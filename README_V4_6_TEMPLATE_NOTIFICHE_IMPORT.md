# CODM AK47DX V4.6 - Template OCR + Notifiche

Questa versione concentra due blocchi:

1. Import risultato: il backend OCR usa il template salvato con il frame calcolato dal frontend, così i riquadri devono coincidere con quelli visti nella pagina Calibrazione.
2. Notifiche: centro notifiche in-app, preferenze per utente, reminder Telegram, menu visibili in base ai permessi, utenti collegabili a giocatori del roster.

## Cosa controllare dopo deploy

- `/version` deve mostrare `V4_6_TEMPLATE_NOTIFICHE_PERMESSI_OK`.
- `/notifications` deve aprire il centro notifiche per utenti loggati.
- `/admin/users` deve permettere di scegliere il player collegato all’utente.
- `/import/match` deve inviare anche `calibration_frame` al backend OCR.
- Render `/health` deve rispondere `2.0.5-v4-6-template-notifications-ak47dx`.

## SQL da eseguire

Eseguire in Supabase SQL Editor:

```txt
supabase/06_auth_events_telegram_ocr_v4.sql
```

La parte V4.6 aggiunge:

- `players.user_id`
- `codm_notification_preferences`
- `codm_notifications`
- policy RLS per notifiche
- backfill collegamento player/profilo quando nickname o UID combaciano

## Import OCR e template

Prima:
- il backend Render calcolava il content frame da solo, spesso diverso da quello della pagina calibrazione.

Ora:
- il frontend calcola il frame immagine con lo stesso algoritmo della calibrazione;
- lo invia al backend come `calibration_frame`;
- il backend applica i riquadri del template sullo stesso frame.

Quindi se i riquadri sono corretti in `/calibration`, devono essere coerenti anche in `/import/match`.

## Notifiche

Pagina:

```txt
/notifications
```

L’utente può scegliere:

- notifiche dentro app
- Telegram
- email futura
- eventi/convocazioni
- reminder
- statistiche
- import risultati
- admin/permessi

I reminder Telegram continuano a usare:

```txt
/api/telegram/reminders?secret=CRON_SECRET
```

Quando parte un reminder, viene creata anche una notifica in-app per i convocati collegati a un utente. Se non ci sono convocati collegati, vengono notificati staff/coach/owner.
