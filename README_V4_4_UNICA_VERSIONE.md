# CODM AK47DX V4.4 - Unica versione allineata

## Obiettivo
Questa versione sistema in un unico pacchetto:

- layout mobile generale e tabelle fuori schermo;
- menu laterale visibile solo per ruolo;
- admin/users con email, nome registrato, nome giocatore e UID;
- eventi con vista calendario mensile;
- convocazioni giocatori negli eventi;
- Telegram test e reminder con lista convocati;
- import partita solo nostro team;
- avversario salvato solo come clan, score ed esito;
- backend OCR Render 2.0.3 più veloce perché legge solo il team scelto.

## Installazione
1. Fai backup della cartella progetto.
2. Mantieni solo `.git` e `.env.local` se serve.
3. Cancella il resto vecchio.
4. Copia dentro il contenuto interno di questo ZIP.
5. Esegui:

```bat
npm ci --legacy-peer-deps
npm run build
```

Oppure:

```bat
CONTROLLA_V4_4_COMPLETO.bat
```

## SQL Supabase obbligatorio
Esegui in Supabase SQL Editor:

```txt
supabase\06_auth_events_telegram_ocr_v4.sql
```

Questa versione aggiunge:

- `profiles.email`;
- `codm_events.convocations`;
- `codm_events.convocations_text`;
- tabella `codm_event_players`;
- trigger registrazione aggiornato: nuovo utente viene assegnato come richiesta pending al primo clan disponibile.

## Deploy frontend
Dopo build locale OK:

```bat
git add -A
git commit -m "fix: CODM v4.4 clan events ocr own team"
git push origin main
```

## Deploy backend OCR Render
Il backend OCR ha versione:

```txt
2.0.3-v4-4-own-team-fast-ak47dx
```

Devi aggiornare anche Render con la cartella `ocr-backend` presente in questo ZIP.
Poi su Vercel metti:

```txt
NEXT_PUBLIC_OCR_BACKEND_URL=https://ak47dx-ocr-backend.onrender.com
```

## Test Telegram
Dopo deploy Vercel:

```txt
/api/telegram/status
/api/telegram/test?secret=IL_TUO_CRON_SECRET
/api/telegram/reminders?secret=IL_TUO_CRON_SECRET
```

## Test OCR
1. Apri `/ocr-status`.
2. Verifica che veda backend 2.0.3.
3. Vai su `/import/match`.
4. Scegli se il tuo team è blu o rosso.
5. Carica screenshot.
6. Importa: verranno letti solo i 5 player del tuo team.

## Nota importante
Le statistiche degli avversari non vengono più salvate. Restano solo:

- clan avversario;
- score avversario;
- vittoria/sconfitta;
- screenshot prova;
- note partita.
