# Installazione CLAN MANAGER V8.2A

1. Esegui su Supabase `supabase/FINAL_SCHEMA_CLAN_MANAGER.sql`.
2. Controlla Vercel Environment Variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `NEXT_PUBLIC_APP_URL`
   - `NEXT_PUBLIC_APP_NAME=CLAN MANAGER`
   - `TELEGRAM_BOT_TOKEN`
   - `TELEGRAM_CHAT_ID`
   - `CRON_SECRET`
3. Deploy:

```bash
npm ci --legacy-peer-deps
npm run build
git add -A
git commit -m "CLAN MANAGER V8.2A pro telegram reminder template ui"
git push origin main
```

4. Dopo deploy apri `/version` e `/events-health`.
5. Sul telefono fai `/cache-reset`, rimuovi vecchia PWA e reinstallala.
