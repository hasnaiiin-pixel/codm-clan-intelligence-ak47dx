# CODM AK47DX V4.2 - Fix grafica generale + OCR Render

Questa versione corregge il problema visto nello screenshot: menu e login apparivano come testo grezzo perché le utility Tailwind non erano generate e il menu dipendeva solo da classi Tailwind.

## Correzioni principali

- Aggiunti `@tailwind base`, `@tailwind components`, `@tailwind utilities` in `app/globals.css`.
- Menu laterale riscritto con classi CSS stabili `ak-*`, quindi non rimane più aperto sopra la pagina.
- Login/registrazione riscritti con classi CSS stabili `ak-login-*`, layout moderno e responsive.
- `NEXT_PUBLIC_OCR_BACKEND_URL` usa solo URL HTTPS pubblico su Vercel; localhost viene usato solo in locale.
- Health OCR timeout aumentato a 25 secondi per cold start Render.
- OCR scoreboard/profile timeout aumentato a 180 secondi.
- Versioni OCR accettate: `2.0.1-deployable-pwa-yolo-ak47dx` e `2.0.0-definitive-ak47dx`.
- Marker versione aggiornato: `V4_2_GRAFICA_MENU_LOGIN_OCR_RENDER_OK`.

## Procedura corretta

1. Fai backup della cartella progetto attuale.
2. Non cancellare `.git` e `.env.local` se vuoi mantenere repo e test locale.
3. Cancella il resto della cartella progetto.
4. Copia dentro il contenuto di questo ZIP, non la cartella contenitore.
5. Esegui:

```bat
npm ci --legacy-peer-deps
npm run build
```

6. Se build OK:

```bat
git add -A
git commit -m "fix: CODM v4.2 grafica generale e OCR Render"
git push origin main
```

7. Dopo deploy Vercel Ready Production, apri:

- `/version`
- `/cache-reset`
- `/login`
- `/ocr-status`
- `/api/telegram/status`
- `/api/telegram/reminders?secret=IL_TUO_CRON_SECRET`

## OCR Render

Su Vercel imposta:

```txt
NEXT_PUBLIC_OCR_BACKEND_URL=https://TUO-BACKEND-RENDER.onrender.com
```

Non usare mai su Vercel:

```txt
http://127.0.0.1:8780
http://localhost:8780
```

Se Render è free può andare in cold start: apri prima `/ocr-status` per svegliarlo, aspetta che `/health` risponda, poi riprova l'import OCR.
