# Installazione rapida — CLAN MANAGER V8.1C

1. Se non hai già eseguito il fix schema completo, esegui `supabase/16_V8_1C_CLIENT_UUID_DELETE_EDIT_FIX.sql` in Supabase.
2. Controlla variabili Vercel: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, Telegram.
3. Deploy:

```bash
cd cartella-progetto
npm ci --legacy-peer-deps
npm run build
git add -A
git commit -m "CLAN MANAGER V8.1C fix modifica cancellazione eventi UUID client"
git push origin main
```

4. Apri `/version`: deve mostrare `V8_1C_CLIENT_UUID_DELETE_EDIT_FIX_OK`.
5. Apri `/cache-reset` su PWA e reinstalla icona.
