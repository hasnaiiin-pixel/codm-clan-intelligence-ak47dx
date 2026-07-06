# CODM AK47DX V7.5 - Deep Events Delete Opponent Sync Final

## Analisi reale del problema

Questa release non è una patch piccola. È una revisione completa del flusso Eventi PWA.

Problemi trovati:

1. **Desktop Chrome funzionava, PWA no**
   - La PWA installata poteva tenere eventi/cache locali diversi da Chrome desktop.
   - Il caricamento eventi usava lettura diretta Supabase dal client e cache locale insieme.

2. **Evento cancellato riappariva**
   - La cancellazione era fatta dal client con `supabase.from('codm_events').delete()`.
   - Se RLS/ruolo/cache locale non erano perfetti, l’evento spariva per qualche secondo e poi tornava al reload.
   - Inoltre gli eventi confermati venivano salvati anche nella coda locale PWA, quindi potevano riapparire dalla cache.

3. **Nome avversario non preso da telefono/PWA**
   - Su PWA mobile il pulsante salva poteva leggere lo stato React prima dell’ultimo aggiornamento dell’input.
   - Il campo Team B restava quindi al default `Clan avversario` anche se l’utente aveva scritto altro.
   - Anche il titolo evento rimaneva automatico con `Clan avversario`.

4. **Visibilità altri utenti**
   - Il salvataggio/cancellazione deve passare dal server, non dal client, così Vercel usa `SUPABASE_SERVICE_ROLE_KEY` e scrive/legge in modo coerente per tutto il clan.

## Modifiche principali V7.5

- Aggiunta API server `GET /api/events/list`.
- Aggiunta API server `POST /api/events/delete`.
- `Eventi` ora carica da API server con `cache: no-store`.
- `Cancella evento` ora cancella da Supabase tramite API server e poi pulisce PWA/cache locale.
- Aggiunto tombstone locale `codm_deleted_events_v7_5`: se cancelli un evento, la PWA lo blocca e non lo rimostra da cache vecchia.
- Gli eventi sincronizzati non restano più nella coda locale `codm_local_events_v7_0`; restano solo pending/error.
- Team A/Team B sono letti direttamente dal form al submit tramite ref, quindi su PWA telefono non si perde l’ultimo testo scritto.
- Quando scrivi un Team B reale, il titolo automatico diventa `Scrim AK47DX vs Nome Avversario`.
- Service worker aggiornato a cache V7.5.
- SQL V7.5 con policy delete per owner/coach/staff e notifiche/event_players coerenti.

## File principali modificati

- `app/events/page.tsx`
- `app/api/events/list/route.ts`
- `app/api/events/delete/route.ts`
- `src/lib/server/codmEventsApi.ts`
- `public/sw.js`
- `public/codm-release.json`
- `public/deploy-version.json`
- `package.json`
- `supabase/12_V7_5_DEEP_EVENTS_DELETE_OPPONENT_SYNC_FINAL.sql`

## Installazione

1. Fai backup della cartella attuale.
2. Estrai lo ZIP V7.5.
3. Copia il contenuto nella cartella GitHub del progetto CODM.
4. Non copiare `node_modules` da vecchie cartelle.

## Supabase obbligatorio

Esegui in Supabase SQL Editor:

```text
supabase/12_V7_5_DEEP_EVENTS_DELETE_OPPONENT_SYNC_FINAL.sql
```

Questo aggiorna:

- `public.codm_events`
- `public.codm_event_players`
- `public.codm_notifications`
- policy RLS di lettura/scrittura/cancellazione
- indice notifiche/eventi

## Variabili Vercel obbligatorie

Controlla in Vercel > Project > Settings > Environment Variables:

```text
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
NEXT_PUBLIC_APP_URL
NEXT_PUBLIC_APP_NAME
```

La variabile più importante per eventi condivisi e cancellazione definitiva è:

```text
SUPABASE_SERVICE_ROLE_KEY
```

Senza questa, il server non può garantire cancellazione/scrittura condivisa per tutti.

## Comandi Git/npm

```bash
cd cartella-progetto
npm ci --legacy-peer-deps
npm run build
git add -A
git commit -m "CODM AK47DX V7.5 revisione totale eventi PWA"
git push origin main
```

Se Vercel non parte con il nuovo deploy:

```bash
git commit --allow-empty -m "Force Vercel deploy CODM AK47DX V7.5"
git push origin main
```

## Pulizia PWA telefono obbligatoria

Dopo deploy Vercel:

1. Apri `/cache-reset` dal telefono.
2. Premi pulizia cache.
3. Chiudi completamente la PWA dal multitasking.
4. Rimuovi la vecchia icona dalla Home.
5. Apri link Vercel da browser.
6. Aggiungi di nuovo alla schermata Home.

## Test da fare dopo deploy

### Test nome avversario PWA

1. Apri PWA da telefono.
2. Vai in Eventi.
3. Scrivi Team B: per esempio `RIVAL TEAM`.
4. Premi Crea evento.
5. Risultato atteso:
   - Titolo: `Scrim AK47DX vs RIVAL TEAM` o con nome Team A reale.
   - Dettaglio evento mostra Team B corretto.
   - Non deve tornare `Clan avversario`.

### Test evento condiviso

1. Crea evento da telefono.
2. Aggiorna pagina.
3. Apri da browser desktop o altro utente.
4. Risultato atteso:
   - L’evento rimane visibile.
   - L’altro utente vede l’evento.

### Test cancellazione definitiva

1. Cancella evento da telefono o desktop.
2. Aspetta 10 secondi.
3. Aggiorna pagina.
4. Chiudi e riapri PWA.
5. Apri da altro utente.
6. Risultato atteso:
   - L’evento non deve riapparire.
   - Non deve tornare da cache locale.
   - In Supabase `codm_events` la riga deve essere sparita.

### Test import

Controlla che non si siano rotti:

- `/import/profile`
- `/import/match`

La logica import non è stata riscritta in V7.5.

## Verifiche eseguite prima dello ZIP

- `npx tsc --noEmit` passato.
- `node --check public/sw.js` passato.
- `npm run build` completato: compiled successfully, 37 pagine generate, route `/api/events/list` e `/api/events/delete` incluse.

