# CODM AK47DX V4 allineato — istruzioni operative

Questo pacchetto è una versione pulita e allineata. Non contiene `node_modules`, `.git`, `.next`, backup, patch temporanee o `.env.local`.

## 1. Come sostituire i file nella tua cartella

Cartella tua:

```txt
C:\Users\spea4060_tmv331ef\Documents\PROGETTI\COD\CODM_CLAN_INTELLIGENCE_2_0_DEPLOYABLE_PWA_YOLO_AK47DX
```

Consigliato:

1. Fai backup della cartella attuale.
2. Dentro la cartella progetto **non cancellare `.git`** se vuoi continuare a fare push sullo stesso repository.
3. Se hai un `.env.local` funzionante, salvalo a parte.
4. Cancella i vecchi file/cartelle del progetto, esclusi `.git` e `.env.local` se vuoi tenerli.
5. Copia dentro tutti i file di questo ZIP.
6. Rimetti `.env.local` se ti serve in locale.

Cartelle vecchie da eliminare se restano:

```txt
node_modules
.next
patch_files
patch_files_old
patch_source
components
_codm_backup_before_auth_role_guard
backup_visible_routes_*
```

Puoi usare anche:

```bat
PULISCI_VECCHI_FILE_CODM_V4.bat
```

## 2. Installazione e build locale

```bat
npm ci --legacy-peer-deps
npm run build
```

Oppure usa:

```bat
INSTALLA_E_AVVIA_CODM_V4.bat
```

## 3. Controllo route principali

```bat
CONTROLLA_ROUTE_CODM_V4.bat
```

Devono esistere:

```txt
app\events\page.tsx
app\ocr-status\page.tsx
app\api\telegram\reminders\route.ts
app\admin\users\page.tsx
src\components\MobileSidebar.tsx
src\components\WriteAccessBlock.tsx
src\components\PwaInstaller.tsx
```

## 4. Supabase SQL

Esegui in Supabase SQL Editor:

```txt
supabase\06_auth_events_telegram_ocr_v4.sql
```

Se stai creando DB da zero, prima esegui anche:

```txt
supabase\schema.sql
supabase\migration_2_0_definitive_ak47dx.sql
supabase\migration_2_0_deployable_pwa_yolo_ak47dx.sql
```

## 5. Supabase Auth Redirect

Supabase → Authentication → URL Configuration:

```txt
Site URL:
https://TUO-LINK-VERCEL.vercel.app

Redirect URLs:
https://TUO-LINK-VERCEL.vercel.app/**
http://localhost:3000/**
```

## 6. Variabili Vercel

Obbligatorie:

```txt
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
NEXT_PUBLIC_APP_URL
SUPABASE_SERVICE_ROLE_KEY
TELEGRAM_BOT_TOKEN
TELEGRAM_CHAT_ID
CRON_SECRET
```

OCR opzionale finché non pubblichi il backend:

```txt
NEXT_PUBLIC_OCR_BACKEND_URL
```

Non usare `127.0.0.1` o `localhost` su Vercel per OCR.

## 7. GitHub / Vercel

Dopo build locale OK:

```bat
git add -A
git commit -m "feat: CODM v4 aligned auth events telegram OCR"
git push origin main
```

Su Vercel controlla che il deploy nuovo sia `Ready` e `Production`.

## 8. Test online dopo deploy

Apri:

```txt
/version
/cache-reset
/login
/admin/users
/events
/ocr-status
/api/telegram/reminders?secret=IL_TUO_CRON_SECRET
```

`/api/telegram/reminders` deve rispondere JSON, non 404.

## 9. Test funzionale

- Senza login: dashboard, roster, partite, analytics e clan in sola lettura.
- Registrazione: email + nome + nickname CODM + UID opzionale.
- Admin: `/admin/users` vede utenti e assegna ruoli.
- Staff/Coach/Owner: possono importare partite, modificare player, Clan HQ, inviti, eventi.
- Telegram: crea evento in `/events`, poi chiama manualmente l'endpoint reminder.
- OCR: `/ocr-status` deve dire chiaramente se manca backend pubblico.
