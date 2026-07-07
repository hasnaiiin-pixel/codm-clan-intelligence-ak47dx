# CLAN MANAGER AK47DX — V8.1 Final

Build pulita con eventi su database unico Supabase tramite API Vercel.

## Regola eventi

- Creazione: `/api/events/save`
- Modifica: `/api/events/save`
- Cancellazione: `/api/events/delete`
- Lettura: `/api/events/list`
- Risultati/import collegati: `/api/events/update-result`
- Database unico: `public.codm_events`
- Nessun salvataggio locale eventi nella PWA
- Telegram immediato su creazione, modifica, cancellazione e risultati evento

## SQL Supabase

Eseguire solo:

```text
supabase/15_V8_1_EVENTS_EDIT_DELETE_TELEGRAM_CLEAN_FINAL.sql
```

## Deploy

```bash
npm ci --legacy-peer-deps
npm run build
git add -A
git commit -m "CODM AK47DX V8.1 eventi edit delete telegram clean finale"
git push origin main
```
