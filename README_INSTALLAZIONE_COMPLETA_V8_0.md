# CODM AK47DX V8.0 — Single Database Events Final

Questa versione corregge l'incongruenza tra Chrome desktop e PWA installata eliminando definitivamente i percorsi multipli sugli eventi.

## Cosa cambia

- Eventi letti solo da `GET /api/events/list`.
- Eventi creati/aggiornati solo da `POST /api/events/save`.
- Eventi cancellati solo da `POST /api/events/delete`.
- Dettaglio evento per import partite solo da `GET /api/events/detail`.
- Aggiornamento risultato evento da import partite solo da `POST /api/events/update-result`.
- Health check tecnico su `GET /api/events/health`.
- `clan_id` non viene più accettato dal client per filtrare gli eventi.
- `SUPABASE_SERVICE_ROLE_KEY` è obbligatoria: se manca, l'API eventi va in errore invece di usare fallback RLS.
- Home, Eventi e Import partite usano lo stesso flusso server per `codm_events`.
- La PWA non salva e non legge eventi locali.

## SQL Supabase obbligatorio

Eseguire in Supabase SQL Editor:

`supabase/14_V8_0_SINGLE_DATABASE_EVENTS_FINAL.sql`

## Variabili Vercel obbligatorie

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_APP_URL`
- `NEXT_PUBLIC_APP_NAME`

La più importante è `SUPABASE_SERVICE_ROLE_KEY`. Deve stare solo su Vercel/server, mai nel frontend.

## Deploy

```bash
cd cartella-progetto
npm ci --legacy-peer-deps
npm run build
git add -A
git commit -m "CODM AK47DX V8.0 single database eventi finale"
git push origin main
```

Se Vercel non parte:

```bash
git commit --allow-empty -m "Force Vercel deploy CODM AK47DX V8.0"
git push origin main
```

## Controlli dopo deploy

1. Apri `/version` e verifica marker `V8_0_SINGLE_DATABASE_EVENTS_OK`.
2. Apri `/api/events/health` dopo login nella stessa sessione. Deve indicare `mode: service-role`, `localEventsEnabled: false`, `clientClanIdAccepted: false`.
3. Da desktop crea evento, poi apri PWA: deve apparire lo stesso evento.
4. Da PWA crea evento, poi apri desktop: deve apparire lo stesso evento.
5. Cancella evento da desktop: deve sparire anche in PWA dopo refresh.
6. Cancella evento da PWA: deve sparire anche in desktop dopo refresh.

## Pulizia PWA una volta sola

Dopo deploy V8.0:

1. Apri `/cache-reset` dal telefono.
2. Premi pulizia cache.
3. Chiudi la PWA dal multitasking.
4. Rimuovi vecchia icona dalla Home.
5. Apri link Vercel da browser.
6. Aggiungi di nuovo alla schermata Home.

