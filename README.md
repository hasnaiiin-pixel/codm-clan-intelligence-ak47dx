# CLAN MANAGER AK47DX

PWA/Next.js per gestione clan CODM: eventi, scrim/tornei, roster, import risultati, calibrazione OCR, notifiche app e Telegram.

## Versione

**V8.2 PRO TELEGRAM REMINDERS TEMPLATES UI**

Marker deploy: `V8_2_PRO_TELEGRAM_REMINDERS_TEMPLATES_UI_OK`

## Principi stabili

- Eventi solo su Supabase `public.codm_events` tramite API Vercel.
- Nessun evento locale PWA.
- Service role obbligatoria per crea/modifica/cancella eventi.
- Telegram con messaggi HTML professionali e reminder cron.
- App branding: **CLAN MANAGER**.

## File Supabase utili

- `supabase/FINAL_SCHEMA_CLAN_MANAGER.sql`
- `supabase/CHECK_DATABASE_HEALTH.sql`
- `supabase/RESET_CLAN_MANAGER_KEEP_AUTH.sql`
