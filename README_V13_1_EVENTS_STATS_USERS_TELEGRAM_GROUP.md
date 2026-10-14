# CLAN MANAGER AK47DX V13.1

Base stabile: `V13_GENERIC_EVENT_HOME_PWA_HORIZONTAL`.

## Cosa è stato modificato

- `/events`: la prima sezione ora è **Eventi da fare**. Appena entri in Eventi li vedi in alto.
- `/events`: archivio sotto impostato su **Passati automatici** in base alla data/ora.
- `/events`: anche sugli eventi passati restano disponibili i pulsanti per **Inserisci risultato** per ogni partita.
- `/analytics` e `/players`: tabelle statistiche più strette, colonne numeriche compatte.
- K/D/A non è stato modificato: rimane **Kill / Death / Assist**.
- `/analytics`: rimosso grafico **Ranking 1–5**.
- `/admin/users`: aggiunta associazione manuale account registrato ↔ player CODM.
- `/admin/users`: aggiunti permessi granulari con flag.
- Telegram: aggiunto invio anche a gruppo clan tramite `TELEGRAM_GROUP_CHAT_ID`.

## SQL da eseguire su Supabase

Esegui una volta:

```sql
-- file incluso nel pacchetto
supabase/UPDATE_V13_1_USER_PERMISSIONS.sql
```

Serve per aggiungere `clan_members.permissions` e assicurare `players.user_id`.

## Variabili Vercel Telegram

```env
TELEGRAM_BOT_TOKEN=token_bot
TELEGRAM_CHAT_ID=chat_id_privato_admin
TELEGRAM_GROUP_CHAT_ID=-100xxxxxxxxxx
CRON_SECRET=segreto_cron
```

`TELEGRAM_CHAT_ID` resta per test/admin.
`TELEGRAM_GROUP_CHAT_ID` è il gruppo clan dove devono arrivare gli eventi.

## Test consigliati

```bash
npm ci --legacy-peer-deps
npm run build
```

Poi visita:

```text
/api/telegram/status
/api/telegram/test?secret=CRON_SECRET
```

## Comandi Git essenziali

```bash
cd cartella-progetto
npm ci --legacy-peer-deps
npm run build
git add -A
git commit -m "V13.1 fix eventi statistiche utenti telegram gruppo"
git push origin main
```
