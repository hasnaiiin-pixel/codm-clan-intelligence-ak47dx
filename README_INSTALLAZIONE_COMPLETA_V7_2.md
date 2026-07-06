# CODM AK47DX V7.2 — PWA eventi condivisi + notifiche server FINAL

Questa release modifica **lo stesso progetto CODM originale**, non è una app nuova.

## Cosa è stato sistemato

- Crea Evento non usa più insert diretto dal browser.
- Il salvataggio passa da `app/api/events/save/route.ts`.
- La route server scrive davvero in `public.codm_events` usando `SUPABASE_SERVICE_ROLE_KEY`.
- Gli eventi salvati sono visibili anche agli altri utenti perché vengono letti da Supabase, non solo da localStorage/PWA.
- Convocati e riserve vengono scritti in `public.codm_event_players`.
- Quando si crea o aggiorna un evento vengono create notifiche server in `public.codm_notifications` per i membri del clan.
- Il badge del menu mobile conta notifiche locali + notifiche server non lette.
- Nella pagina Notifiche, la lista notifiche è in alto e le impostazioni sono sotto.
- Import giocatori/profilo e import partite risultano ancora compilati nella build.

## File principali modificati

```text
app/events/page.tsx
app/api/events/save/route.ts
app/notifications/page.tsx
src/components/MobileSidebar.tsx
supabase/10_V7_2_EVENTS_SERVER_SYNC_NOTIFICATIONS_FINAL.sql
public/codm-release.json
public/deploy-version.json
package.json
package-lock.json
```

## Supabase — SQL da eseguire

In Supabase apri:

```text
SQL Editor
```

Esegui:

```text
supabase/10_V7_2_EVENTS_SERVER_SYNC_NOTIFICATIONS_FINAL.sql
```

Questo file prepara:

```text
public.codm_events
public.codm_event_players
public.codm_notifications
public.codm_notification_preferences
policy RLS per lettura eventi
policy RLS per notifiche utente
funzioni codm_is_clan_writer / codm_is_clan_owner
```

## Vercel — variabili obbligatorie

Su Vercel, nel progetto CODM, controlla:

```text
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
```

La variabile più importante per questa release è:

```text
SUPABASE_SERVICE_ROLE_KEY
```

Senza questa chiave, la route `/api/events/save` non può scrivere gli eventi server e l'evento resta solo locale/PWA.

Non mettere `SUPABASE_SERVICE_ROLE_KEY` nel codice e non pubblicarla su GitHub.

## Deploy corretto

```bash
cd cartella-progetto
npm ci --legacy-peer-deps
npm run build
git add -A
git commit -m "CODM AK47DX V7.2 eventi condivisi notifiche server finale"
git push origin main
```

Dopo il push Vercel deve aggiornare la PWA automaticamente.

## Verifica da fare dopo deploy

1. Accedi con admin/staff.
2. Vai in **Eventi**.
3. Crea un evento.
4. Risultato atteso:

```text
✅ evento resta nella lista Eventi
✅ evento resta in Home
✅ evento resta in Calendario
✅ evento è presente in Supabase > public.codm_events
✅ convocati/riserve sono in public.codm_event_players
✅ notifiche server sono in public.codm_notifications
✅ altro utente vede evento dopo refresh/login
✅ altro utente vede notifica nella pagina Notifiche
```

## Nota su localhost

`localhost` serve solo per prova locale. La versione vera va aperta dal link Vercel.
