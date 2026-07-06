# CODM AK47DX V7.4 - PWA Mobile Event Form Sync Final

Questa build corregge la differenza tra Chrome desktop e PWA installata.

## Cosa cambia

- Service worker PWA riscritto: pagine, chunk Next.js e dati dinamici usano network-first.
- Le API `/api/*` non vengono mai lette da cache.
- Le cache vecchie `codm-*` vengono eliminate automaticamente.
- Il form Eventi su mobile non usa più pulsante sticky vicino alla tastiera/menu basso.
- I nomi Team A / Team B vengono salvati usando stato/ref sincronizzato, così non si perdono su PWA.
- Le immagini logo/cover vengono compresse prima del salvataggio.
- LocalStorage eventi è protetto: se immagine troppo grande, non blocca più l’evento.
- Eventi continuano a passare da `/api/events/save` e vengono scritti su `public.codm_events`.

## SQL Supabase

Se hai già eseguito `supabase/11_V7_3_EVENTS_CLOUD_NOTIFICATIONS_ICON_FINAL.sql`, non serve rifare schema.
Per sicurezza puoi rieseguirlo: è idempotente.

## Variabili Vercel obbligatorie

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_APP_URL`
- `NEXT_PUBLIC_APP_NAME`

La più importante per eventi condivisi e notifiche cloud è `SUPABASE_SERVICE_ROLE_KEY`.

## Comandi

```bash
cd cartella-progetto
npm ci --legacy-peer-deps
npm run build
git add -A
git commit -m "CODM AK47DX V7.4 PWA mobile evento sync finale"
git push origin main
```

## Dopo deploy Vercel

1. Apri Vercel > Deployments.
2. Devi vedere il commit V7.4.
3. Se non parte, fai un nuovo commit vuoto:

```bash
git commit --allow-empty -m "Force Vercel deploy CODM AK47DX V7.4"
git push origin main
```

## Reset PWA telefono obbligatorio dopo questa versione

Per eliminare la vecchia cache della PWA:

1. Apri la PWA.
2. Vai su `/cache-reset`.
3. Premi pulizia cache.
4. Chiudi completamente l’app dal multitasking.
5. Riapri dal link Vercel.
6. Rimuovi la vecchia icona dalla Home e aggiungi di nuovo la PWA.

## Test evento

1. Login admin/staff.
2. Eventi > Crea evento.
3. Scrivi Titolo, Team A, Team B, orari.
4. Salva.
5. L’evento deve restare in Eventi.
6. Aggiorna pagina.
7. L’evento deve restare.
8. Apri con altro utente.
9. L’evento deve essere visibile anche a lui.
10. Vai su Notifiche: la notifica evento deve apparire in alto.

## Import giocatori e import partite

Non sono stati riscritti. Dopo deploy verifica comunque:

- `/import/profile`
- `/import/match`

