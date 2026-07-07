# Installazione CLAN MANAGER AK47DX

## Deploy

```bash
cd cartella-progetto
npm ci --legacy-peer-deps
npm run build
git add -A
git commit -m "CLAN MANAGER V8.2C import pulito template telegram delete"
git push origin main
```

## Variabili Vercel richieste

- NEXT_PUBLIC_SUPABASE_URL
- NEXT_PUBLIC_SUPABASE_ANON_KEY
- SUPABASE_SERVICE_ROLE_KEY
- NEXT_PUBLIC_APP_URL
- NEXT_PUBLIC_APP_NAME = CLAN MANAGER
- TELEGRAM_BOT_TOKEN
- TELEGRAM_CHAT_ID
- CRON_SECRET

## Supabase

Usare solo i file nella cartella `supabase`:

- `FINAL_SCHEMA_CLAN_MANAGER.sql`
- `CHECK_DATABASE_HEALTH.sql`
- `RESET_CLAN_MANAGER_KEEP_AUTH.sql`
