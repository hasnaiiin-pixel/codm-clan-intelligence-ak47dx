# CLAN MANAGER V8.2A - Fix Vercel Hobby Cron

Questa build rimuove il cron `*/10 * * * *` da `vercel.json` perché gli account Vercel Hobby accettano solo cron giornalieri.

## Cosa cambia

- Deploy Vercel non viene più bloccato dal limite Hobby Cron.
- I reminder Telegram restano disponibili tramite endpoint:
  `/api/telegram/reminders?secret=CRON_SECRET`
- Per reminder ogni 10 minuti usare un servizio cron esterno gratuito, ad esempio cron-job.org, UptimeRobot o EasyCron.

## URL da chiamare con cron esterno

`https://TUO-DOMINIO-VERCEL.vercel.app/api/telegram/reminders?secret=IL_TUO_CRON_SECRET`

Impostare intervallo: ogni 10 minuti.

## Deploy

```bash
npm ci --legacy-peer-deps
npm run build
git add -A
git commit -m "CLAN MANAGER V8.2A fix Vercel Hobby cron"
git push origin main
```

## Marker

`V8_2A_HOBBY_CRON_EXTERNAL_OK`
