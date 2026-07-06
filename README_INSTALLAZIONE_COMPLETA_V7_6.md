# CODM AK47DX V7.6 — DATABASE ONLY EVENTS FINAL

Questa release chiude l'incongruenza tra browser Chrome desktop e PWA installata.

## Decisione architetturale definitiva

Da V7.6 gli eventi usano una sola sorgente dati:

```text
Supabase public.codm_events
Supabase public.codm_event_players
Supabase public.codm_notifications
```

La PWA non deve più:

```text
- leggere eventi da localStorage
- salvare eventi locali
- tenere coda pending
- fare merge tra database e cache PWA
- nascondere cancellazioni localmente
- ripristinare bozze evento locali
```

Se Supabase/API non conferma, l'evento non viene creato, non viene aggiornato e non viene cancellato.

## File principali modificati

```text
app/events/page.tsx
app/page.tsx
app/api/events/save/route.ts
src/services/codmEventRepository.js
src/services/codmEventsSync.js
src/components/PwaInstaller.tsx
app/cache-reset/page.tsx
public/sw.js
public/offline.html
public/codm-release.json
public/deploy-version.json
app/version/page.tsx
supabase/13_V7_6_DATABASE_ONLY_EVENTS_FINAL.sql
```

## Supabase obbligatorio

Eseguire in Supabase SQL Editor:

```text
supabase/13_V7_6_DATABASE_ONLY_EVENTS_FINAL.sql
```

Questo SQL:

```text
- garantisce public.codm_events
- garantisce public.codm_event_players
- garantisce public.codm_notifications
- resetta local_id/sync_status/sync_error vecchi
- mantiene gli eventi reali già presenti in database
- imposta policy RLS coerenti
```

## Vercel variabili obbligatorie

Controllare in Vercel > Settings > Environment Variables:

```text
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
NEXT_PUBLIC_APP_URL
NEXT_PUBLIC_APP_NAME
```

`SUPABASE_SERVICE_ROLE_KEY` è obbligatoria per scrivere/cancellare eventi in modo condiviso e definitivo.

## Comandi deploy

```bash
cd cartella-progetto
npm ci --legacy-peer-deps
npm run build
git add -A
git commit -m "CODM AK47DX V7.6 database unico eventi finale"
git push origin main
```

Se Vercel non parte col commit nuovo:

```bash
git commit --allow-empty -m "Force Vercel deploy CODM AK47DX V7.6"
git push origin main
```

## Pulizia PWA obbligatoria una sola volta

Dopo deploy Vercel:

```text
1. Apri la PWA dal telefono
2. Vai su /cache-reset
3. Premi pulizia cache
4. Chiudi la PWA dal multitasking
5. Rimuovi vecchia icona dalla Home
6. Apri il link Vercel da browser
7. Aggiungi di nuovo alla schermata Home
8. Login di nuovo
```

Questa pulizia serve a eliminare i vecchi eventi locali rimasti nella PWA installata.

## Verifica definitiva

### Test 1 — database unico

```text
1. Apri browser desktop
2. Apri PWA telefono
3. Fai login con lo stesso utente o utenti diversi
4. Vai in Eventi
```

Risultato corretto:

```text
Browser e PWA devono mostrare la stessa identica lista eventi.
```

### Test 2 — crea evento da telefono

```text
1. PWA telefono > Eventi
2. Crea evento
3. Scrivi nome avversario reale
4. Salva
5. Aggiorna pagina
6. Apri desktop
```

Risultato corretto:

```text
Evento resta visibile in PWA.
Evento è visibile in desktop.
Nome avversario resta quello scritto.
Nessun evento locale/pending.
```

### Test 3 — cancella evento

```text
1. Cancella evento da PWA o desktop
2. Aspetta 10 secondi
3. Aggiorna PWA
4. Aggiorna desktop
5. Controlla Supabase > codm_events
```

Risultato corretto:

```text
Evento sparisce ovunque.
Evento non riappare.
La riga non esiste più in public.codm_events.
```

### Test 4 — se Supabase non conferma

Risultato corretto:

```text
La UI mostra errore.
L'evento non appare localmente.
Nessun dato finto in PWA.
```

## Nota importante

Non usare più SQL o build V7.1, V7.3, V7.4 o V7.5 per eventi. Usare solo V7.6.
