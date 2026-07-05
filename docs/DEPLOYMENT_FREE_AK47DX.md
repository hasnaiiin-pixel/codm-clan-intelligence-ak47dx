# AK47DX - Distribuzione gratuita / economica

## Obiettivo
Dare un link al clan e far installare l'app su telefono come PWA.

## Soluzione consigliata iniziale

- Frontend Next.js: Vercel Hobby / Free.
- Database, Auth, Storage screenshot: Supabase Free.
- Backend OCR FastAPI: Render Free per test, oppure Google Cloud Run per stabilità.

## Procedura rapida

1. Carica il progetto su GitHub.
2. Crea progetto Supabase.
3. Esegui in ordine:
   - `supabase/schema.sql`
   - `supabase/migration_2_0_definitive_ak47dx.sql`
   - `supabase/migration_2_0_deployable_pwa_yolo_ak47dx.sql`
4. Crea progetto Vercel collegato al repo.
5. Imposta variabili ambiente Vercel:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `NEXT_PUBLIC_APP_URL`
   - `NEXT_PUBLIC_OCR_BACKEND_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `TELEGRAM_BOT_TOKEN`
   - `TELEGRAM_CHAT_ID`
   - `CRON_SECRET`
6. Pubblica backend OCR:
   - Render: usa `render.yaml`.
   - Cloud Run: usa `ocr-backend/Dockerfile`.
7. Verifica backend:
   - `/health` deve rispondere `2.0.0-definitive-ak47dx`.
8. Apri `/invite`, genera link, invialo ai player.
9. Su telefono: apri link e fai “Aggiungi a schermata Home”.

## Note
Render Free può andare in sleep. Per scrim importanti o tanti player, Cloud Run o VPS è più stabile.
