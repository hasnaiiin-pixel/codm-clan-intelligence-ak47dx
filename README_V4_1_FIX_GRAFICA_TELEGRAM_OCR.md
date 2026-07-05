# CODM AK47DX V4.1 — Fix grafica generale + Telegram API + OCR Render

Questa versione corregge il problema visto online dove login/menu erano senza grafica e tutti i link comparivano piccoli in alto/sinistra.

## Cosa è stato corretto

- Aggiunto `tailwind.config.js`.
- Aggiunto `postcss.config.js`.
- Verificato `app/globals.css` con Tailwind attivo.
- Verificati componenti in `src/components`: `MobileSidebar`, `PwaInstaller`, `WriteAccessBlock`, `Header`.
- Verificata API Telegram: `app/api/telegram/reminders/route.ts`.
- Aggiunta API controllo Telegram: `/api/telegram/status`.
- Aggiunta API controllo app: `/api/health`.
- Allineato OCR backend frontend a `2.0.1-deployable-pwa-yolo-ak47dx` mantenendo compatibilità con `2.0.0-definitive-ak47dx`.
- Mantenuta pagina `/ocr-status`.
- Puliti file temporanei, `.next`, `node_modules`, backup e cache.

## Perché la grafica era rotta

Il progetto usava classi Tailwind come `min-h-screen`, `rounded-2xl`, `bg-slate-950`, ecc. ma mancavano i file di configurazione Tailwind/PostCSS. Per questo in produzione alcune pagine risultavano quasi solo HTML grezzo.

## Build verificata

Build eseguita con successo nel pacchetto V4.1:

```txt
✓ Compiled successfully
✓ Generating static pages (29/29)
/api/telegram/reminders presente
/api/telegram/status presente
/events presente
/ocr-status presente
/version presente
/cache-reset presente
```

## Come installare

1. Fai backup della cartella progetto attuale.
2. Non cancellare `.git` se vuoi continuare a usare lo stesso repo.
3. Cancella i vecchi file del progetto, tranne `.git` e il tuo `.env.local` se ti serve.
4. Copia dentro il contenuto dello ZIP V4.1.
5. Da CMD nella cartella progetto:

```bat
npm ci --legacy-peer-deps
npm run build
```

6. Se build OK:

```bat
git add -A
git commit -m "fix: CODM v4.1 ui telegram ocr aligned"
git push origin main
```

## Variabili Vercel obbligatorie

```txt
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
NEXT_PUBLIC_APP_URL
SUPABASE_SERVICE_ROLE_KEY
TELEGRAM_BOT_TOKEN
TELEGRAM_CHAT_ID
CRON_SECRET
```

OCR Render:

```txt
NEXT_PUBLIC_OCR_BACKEND_URL=https://TUO-BACKEND-RENDER.onrender.com
```

Non usare `localhost` o `127.0.0.1` su Vercel.

## Test dopo deploy

Apri dominio Production, non Preview protetta:

```txt
/version
/cache-reset
/api/health
/api/telegram/status
/api/telegram/reminders?secret=IL_TUO_CRON_SECRET
/login
/events
/ocr-status
```

Se `/api/telegram/reminders` dà 404, Vercel sta deployando un commit vecchio o manca `app/api/telegram/reminders/route.ts`.

Se la grafica è ancora rotta, apri `/cache-reset`, pulisci cache e ricarica. Su telefono rimuovi e reinstalla eventuale PWA vecchia.
