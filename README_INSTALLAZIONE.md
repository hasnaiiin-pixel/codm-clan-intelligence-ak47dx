# Installazione CLAN MANAGER V9.0

1. Fai backup della cartella precedente.
2. Copia il contenuto della cartella della release nella root del progetto GitHub.
3. Esegui:

```bash
npm ci --legacy-peer-deps
npm run build
git add -A
git commit -m "CLAN MANAGER V9.0 complete pro release"
git push origin main
```

4. Su Vercel controlla le variabili:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_APP_URL`
- `NEXT_PUBLIC_APP_NAME=CLAN MANAGER`
- `TELEGRAM_BOT_TOKEN`
- `TELEGRAM_CHAT_ID`
- `CRON_SECRET`

5. Dopo deploy apri `/version`, `/events-health` e poi pulisci la PWA da `/cache-reset`.
