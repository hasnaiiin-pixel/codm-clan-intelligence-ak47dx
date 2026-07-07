# CLAN MANAGER V8.2 - Istruzioni complete

## Cosa cambia

- Telegram professionale con riepilogo SCRIM/TORNEO, avversario, data, lobby, partite, mappa, modalità, titolari, riserve, BAN, link e note.
- Reminder selezionabili: giorni, ore, minuti e messaggio evento iniziato.
- Vercel Cron ogni 10 minuti su `/api/telegram/reminders`.
- Layout Eventi più compatto.
- Filtri calibrazione moderni con ricerca, gruppi e pulsante X.
- Import risultati mostra in alto telefono/template attivo vicino alla scelta immagine.
- Nomi telefono/template con maiuscole, spazi e simboli.
- Pulizia root e Supabase: lasciati solo file finali.

## Supabase

Esegui solo:

```text
supabase/FINAL_SCHEMA_CLAN_MANAGER.sql
```

Controllo:

```text
supabase/CHECK_DATABASE_HEALTH.sql
```

## Vercel

Variabili obbligatorie:

```text
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
NEXT_PUBLIC_APP_URL
NEXT_PUBLIC_APP_NAME=CLAN MANAGER
TELEGRAM_BOT_TOKEN
TELEGRAM_CHAT_ID
CRON_SECRET
```

## Deploy

```bash
cd cartella-progetto
npm ci --legacy-peer-deps
npm run build
git add -A
git commit -m "CLAN MANAGER V8.2 pro telegram reminder template ui"
git push origin main
```

## Test

1. `/version` deve mostrare `V8_2_PRO_TELEGRAM_REMINDERS_TEMPLATES_UI_OK`.
2. `/events-health` deve mostrare `ok: true`, service role attiva e Telegram configurato.
3. Crea evento con 2/3 partite, titolari, riserve e BAN.
4. Deve arrivare Telegram con riepilogo completo.
5. Imposta evento a +10 minuti e verifica reminder cron/manuale:
   `/api/telegram/reminders?secret=TUO_CRON_SECRET`
6. Calibrazione: salva template con nome libero.
7. Import match: seleziona telefono/template in alto vicino alla scelta immagine.
