# Installazione rapida — CLAN MANAGER V8.1

1. Esegui su Supabase:

```text
supabase/15_V8_1_EVENTS_EDIT_DELETE_TELEGRAM_CLEAN_FINAL.sql
```

2. Controlla variabili Vercel:

```text
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
TELEGRAM_BOT_TOKEN
TELEGRAM_CHAT_ID
CRON_SECRET
NEXT_PUBLIC_APP_URL
NEXT_PUBLIC_APP_NAME
```

3. Build e deploy:

```bash
npm ci --legacy-peer-deps
npm run build
git add -A
git commit -m "CODM AK47DX V8.1 eventi edit delete telegram clean finale"
git push origin main
```

4. Dopo deploy: apri `/cache-reset` da PWA, pulisci, rimuovi vecchia icona e reinstalla.
