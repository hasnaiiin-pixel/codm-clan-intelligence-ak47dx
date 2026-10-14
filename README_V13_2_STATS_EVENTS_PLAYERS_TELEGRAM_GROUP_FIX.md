# CLAN MANAGER AK47DX - V13.2

Base stabile: **V13 / V13.1**. Patch mirata, senza modificare import risultati/OCR e senza cambiare il significato di K/D/A.

## Cosa cambia

- **Statistiche**
  - `Partite` ora conta le partite uniche giocate, non le righe della tabella giocatori.
  - K/D/A resta **Kill / Death / Assist**.
  - Intestazioni tabella più corte e a capo.
  - Righe verticali tra colonne per leggere meglio i numeri.
  - Rimossa la parte grafico Ranking 1-5.

- **Eventi**
  - In Home ora gli eventi da fare sono visibili subito in alto.
  - In pagina Eventi la prima sezione è sempre `Eventi da fare / partite programmate`.
  - Eventi passati vengono messi sotto in automatico in base a data/ora e stato.
  - Anche negli eventi passati resta possibile inserire o modificare risultato.

- **Utenti / player**
  - In Admin > Utenti la lista di associazione mostra player già presenti nel roster e nomi trovati nelle statistiche/import.
  - Se il player esiste solo nelle statistiche, selezionandolo viene creato automaticamente in `players` e associato all'account registrato.
  - I permessi granulari restano gestibili con flag.

- **Giocatori**
  - Clic sul nome giocatore apre il profilo personale `/players/[id]`.
  - Profilo con dati roster, snapshot profilo e storico partite con Kill / Death / Assist.

- **Telegram**
  - Invio a chat privata/admin + gruppo clan.
  - Variabile consigliata: `TELEGRAM_GROUP_CHAT_ID=-100xxxxxxxxxx`.
  - Alias supportati: `TELEGRAM_CLAN_GROUP_CHAT_ID`, `TELEGRAM_GROUP_ID`, `TELEGRAM_CHAT_ID_GROUP`.

## SQL Supabase

Eseguire in Supabase SQL Editor se non è già stato fatto con V13.1:

```text
supabase/UPDATE_V13_2_STATS_PLAYERS_EVENTS_TELEGRAM.sql
```

Lo script è idempotente: aggiunge solo colonne/indici mancanti per permessi e associazione account-player.

## Configurazione Telegram gruppo

1. Aggiungi il bot nel gruppo Telegram AK47DX.
2. Metti il bot admin o almeno con permesso di scrivere.
3. Nel gruppo scrivi `/start@NomeTuoBot`.
4. Apri:

```text
https://api.telegram.org/bot<TUO_TOKEN>/getUpdates
```

5. Cerca il `chat.id` del gruppo, di solito negativo tipo:

```text
-1001234567890
```

6. Su Vercel imposta:

```env
TELEGRAM_BOT_TOKEN=token_bot
TELEGRAM_CHAT_ID=chat_privata_admin
TELEGRAM_GROUP_CHAT_ID=-1001234567890
CRON_SECRET=tuo_secret
SUPABASE_SERVICE_ROLE_KEY=service_role_key
```

7. Dopo il deploy verifica:

```text
/api/telegram/status
/api/telegram/test?secret=TUO_CRON_SECRET
```

Se `/api/telegram/status` non mostra target `group`, la variabile ambiente gruppo non è stata salvata o il deploy non è stato rifatto.

## Comandi deploy

```bash
cd cartella-progetto
npm ci --legacy-peer-deps
npm run build
git add -A
git commit -m "V13.2 fix statistiche eventi player telegram gruppo"
git push origin main
```

## Verifica post deploy

- Home: eventi da fare visibili subito sopra le card principali.
- Eventi: sezione `Eventi da fare / partite programmate` in alto.
- Eventi passati: pulsante inserimento risultato disponibile.
- Statistiche: colonna `Partite`, non `Righe`.
- Giocatori: clic su nome apre profilo personale.
- Admin utenti: tendina player include anche `da statistiche/crea player`.
- Telegram: test arriva sia in chat privata sia nel gruppo.
