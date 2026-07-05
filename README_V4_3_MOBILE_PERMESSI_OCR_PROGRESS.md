# CODM AK47DX V4.3 - Mobile layout, permessi menu, OCR progress, Telegram test

Questa versione è stata allineata per correggere i problemi visti da telefono:

- layout troppo largo / riquadri fuori schermo;
- menu laterale che restava visibile o sopra la pagina;
- login e registrazione con grafica incoerente;
- tabelle import partita che allargavano tutta la pagina;
- menu visibili anche a utenti senza permessi;
- OCR senza percentuale durante upload/lavorazione;
- test Telegram più semplice;
- OCR Render più robusto per K/D/A.

## Controllo build

Nel progetto eseguire:

```bat
npm ci --legacy-peer-deps
npm run build
```

La build è stata verificata nel pacchetto: Next.js compila e mostra 30 route, incluse:

- `/admin/users`
- `/events`
- `/ocr-status`
- `/api/telegram/reminders`
- `/api/telegram/status`
- `/api/telegram/test`
- `/version`
- `/cache-reset`

## Sostituzione file

1. Fai backup della cartella attuale.
2. Non cancellare `.git` e `.env.local`.
3. Cancella il resto vecchio.
4. Copia nella root progetto tutto il contenuto di questo pacchetto.
5. Esegui build.
6. Fai push.

```bat
git add -A
git commit -m "fix: CODM v4.3 mobile permessi OCR progress"
git push origin main
```

## Dopo deploy Vercel

Aprire il dominio Production, poi:

- `/version` deve mostrare marker V4_3_MOBILE_PERMESSI_OCR_PROGRESS_OK
- `/cache-reset` per pulire PWA/cache telefono
- `/api/health` per controllare route
- `/api/telegram/status` per vedere env Telegram
- `/api/telegram/test?secret=CRON_SECRET` per inviare test immediato Telegram
- `/api/telegram/reminders?secret=CRON_SECRET` per controllare reminder eventi

## Variabili Vercel richieste

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_APP_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `TELEGRAM_BOT_TOKEN`
- `TELEGRAM_CHAT_ID`
- `CRON_SECRET`
- `NEXT_PUBLIC_OCR_BACKEND_URL` opzionale finché OCR Render non è online

## Eventi e Telegram

1. Login come owner/staff/coach.
2. Apri `/events`.
3. Crea evento con data/ora.
4. Per test immediato Telegram apri:

```txt
https://DOMINIO-PRODUCTION.vercel.app/api/telegram/test?secret=CRON_SECRET
```

5. Per reminder reale crea evento tra 12 minuti e apri:

```txt
https://DOMINIO-PRODUCTION.vercel.app/api/telegram/reminders?secret=CRON_SECRET
```

Se entra nella finestra 10 minuti, invia messaggio. Per automatico usa cron-job.org ogni 10 minuti.

## Clan e player

- `/clan`: modifica HQ clan solo con ruolo staff/coach/owner.
- `/players`: aggiungi player manuali solo con ruolo staff/coach/owner.
- `/admin/users`: assegna ruoli agli utenti registrati.
- Il menu laterale ora nasconde le sezioni Admin/Owner se l'utente non ha permessi.

## OCR Render

Backend atteso V4.3:

```txt
2.0.2-v4-3-mobile-ocr-progress-ak47dx
```

Sono accettate anche versioni 2.0.1 e 2.0.0 per compatibilità.

Su Vercel mettere:

```txt
NEXT_PUBLIC_OCR_BACKEND_URL=https://TUO-BACKEND-RENDER.onrender.com
```

Non usare localhost o 127.0.0.1 su Vercel.

Il backend è stato reso più robusto su K/D/A con più varianti Tesseract. Se OCR continua a leggere male, controllare `/ocr-status`: deve dire backend raggiungibile e motore OCR pronto.
