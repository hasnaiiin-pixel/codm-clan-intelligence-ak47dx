# CODM AK47DX V4.1 - UI / Telegram / OCR allineato

## Cosa corregge

- Grafica rovinata: aggiunti `tailwind.config.js`, `postcss.config.js` e direttive Tailwind in `app/globals.css`.
- Menu laterale: le classi Tailwind ora vengono compilate, quindi il menu non resta più stampato sopra la pagina.
- Login/registrazione: la grafica Tailwind viene caricata correttamente.
- Telegram 404: verificare che esista `app/api/telegram/reminders/route.ts`. Aggiunto anche `/api/telegram/status` per controllare token/chat ID.
- OCR: in produzione Vercel non prova più localhost/127.0.0.1 nella pagina import profilo; richiede `NEXT_PUBLIC_OCR_BACKEND_URL` pubblico.
- Versione aggiornata: `/version` mostra marker `V4_1_UI_TAILWIND_TELEGRAM_ROUTE_OCR_FIX_OK`.

## Dopo sostituzione file

```bat
npm ci --legacy-peer-deps
npm run build
git add -A
git commit -m "fix: CODM v4.1 UI telegram OCR aligned"
git push origin main
```

## Test online

Aprire sul dominio Production corretto:

- `/version`
- `/cache-reset`
- `/api/health`
- `/api/telegram/status?secret=CRON_SECRET`
- `/api/telegram/reminders?secret=CRON_SECRET`
- `/login`
- `/events`
- `/ocr-status`

Se `/api/telegram/reminders` dà 404, Vercel sta usando un commit vecchio o non è stato pushato `app/api/telegram/reminders/route.ts`.
