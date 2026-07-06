# CODM AK47DX V7.3 - EVENTS CLOUD NOTIFICATIONS ICON FINAL

Questa è la build completa del progetto CODM reale, non una app rifatta da zero e non una patch separata.

## Cosa è stato sistemato

- Crea Evento ora passa dalla route server `/api/events/save`.
- L'evento viene scritto su `public.codm_events` e resta visibile nella lista Eventi.
- Gli altri utenti leggono gli eventi da Supabase, quindi l'evento è condiviso.
- Convocati/riserve vengono scritti in `public.codm_event_players`.
- Le notifiche server vengono scritte in `public.codm_notifications` per i membri del clan quando `SUPABASE_SERVICE_ROLE_KEY` è configurata.
- La notifica locale PWA viene salvata dopo la conferma server, così non appare una notifica falsa per eventi non condivisi.
- La pagina Notifiche mostra prima le notifiche ricevute e sotto le preferenze.
- Nella creazione evento le impostazioni notifiche/Telegram sono state spostate più in basso.
- L'icona PWA MIRZA è stata ritagliata più vicino e ingrandita.
- Import profilo giocatori e import partite non sono stati riscritti; la build conferma che `/import/profile` e `/import/match` compilano correttamente.

## Supabase obbligatorio

Eseguire in Supabase SQL Editor:

```text
supabase/11_V7_3_EVENTS_CLOUD_NOTIFICATIONS_ICON_FINAL.sql
```

Questo file usa la tabella reale dell'app:

```text
public.codm_events
```

Non usare più vecchie patch basate su `public.events`.

## Variabili ambiente Vercel obbligatorie

In Vercel > Project > Settings > Environment Variables devono esserci:

```text
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
NEXT_PUBLIC_APP_URL
NEXT_PUBLIC_APP_NAME
```

`SUPABASE_SERVICE_ROLE_KEY` è server-only. Non deve essere usata nel frontend. Serve per:

- agganciare l'admin principale al clan AK47DX;
- salvare eventi condivisi senza blocchi RLS;
- creare notifiche per tutti i membri del clan.

Senza `SUPABASE_SERVICE_ROLE_KEY`, l'app prova fallback RLS autenticato, ma le notifiche a tutti i membri non sono garantite.

## Installazione pulita su PC

```bash
cd cartella-progetto
npm ci --legacy-peer-deps
npm run build
```

## Deploy Vercel

```bash
cd cartella-progetto
npm ci --legacy-peer-deps
npm run build
git add -A
git commit -m "CODM AK47DX V7.3 eventi cloud notifiche icona finale"
git push origin main
```

Dopo il push, Vercel pubblica automaticamente se il repository è collegato.

## Verifica funzionale

1. Apri l'app pubblicata su Vercel.
2. Fai login con admin/staff/coach.
3. Vai in Eventi.
4. Crea evento.
5. Deve apparire messaggio: evento scritto su Supabase e visibile agli altri utenti.
6. Aggiorna la pagina Eventi: l'evento deve restare.
7. Apri con un altro utente: l'evento deve comparire.
8. Vai in Notifiche: le notifiche ricevute devono stare in alto, preferenze sotto.
9. Su telefono/PWA, rimuovi e reinstalla l'app dalla Home se l'icona vecchia rimane in cache.

## Nota icona PWA

I telefoni possono tenere in cache l'icona precedente. Per vedere subito la nuova icona:

```text
1. Rimuovi l'icona vecchia dalla schermata Home
2. Apri il sito Vercel da Safari/Chrome
3. Aggiungi di nuovo alla schermata Home
```

## Controllo build eseguito

La build Next.js è stata eseguita con esito positivo:

```text
✓ Compiled successfully
✓ Generating static pages (37/37)
/api/events/save presente
/events compilata
/notifications compilata
/import/match compilata
/import/profile compilata
```
