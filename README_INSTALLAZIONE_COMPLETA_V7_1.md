# CODM AK47DX V7.1 PWA EVENTS STATISTICS FINAL

Questa versione modifica il progetto reale CODM, non è una app nuova standalone.

## Cosa è stato sistemato

- Menu basso PWA reale aggiornato: **Home, Eventi, Statistiche, Notifiche/Login, Altro**.
- Il menu alto con tre linee viene nascosto su telefono/PWA. Resta disponibile per desktop.
- Il tasto **Altro** nel menu basso usa icona ingranaggio, non tre linee/tre puntini.
- Fix definitivo errore Supabase: `invalid input syntax for type uuid: "local-ak47dx"`.
- `local-ak47dx` non viene più mandato dentro `clan_id` UUID.
- Se il clan Supabase non è pronto, l'evento viene salvato in locale senza rompere il salvataggio.
- Quando l'evento viene creato, appare subito nella lista Eventi, nel Calendario e nella Home anche prima del refresh remoto.
- La Home legge anche eventi locali PWA, quindi gli eventi salvati offline restano visibili.
- Build Next.js verificata con `npm run build`.

## Installazione pulita su PC

1. Fai backup della vecchia cartella.
2. Cancella la vecchia cartella del progetto CODM.
3. Estrai questo ZIP.
4. Apri terminale nella cartella estratta.
5. Esegui:

```bash
npm ci --legacy-peer-deps
npm run build
npm start
```

Poi apri:

```text
http://localhost:3000
```

## Supabase

In Supabase apri **SQL Editor** ed esegui:

```text
supabase/09_V7_1_PWA_EVENTS_STATISTICS_FINAL.sql
```

Questa migrazione lavora sulla tabella reale dell'app:

```text
public.codm_events
```

Non usare le vecchie patch che creavano `public.events`, perché il progetto reale usa `public.codm_events`.

## Verifica da telefono/PWA

1. Apri la PWA dal telefono.
2. Controlla menu basso:

```text
Home | Eventi | Statistiche | Notifiche/Login | Altro
```

3. Non deve comparire il menu alto con tre linee su telefono.
4. Vai su **Eventi**.
5. Premi **Crea evento**.
6. Salva un evento.
7. L'evento deve comparire subito in:

```text
Eventi da fare
Calendario
Archivio eventi
Home > Eventi futuri / Scrim
```

8. Deve arrivare la notifica interna con badge.
9. Non deve più comparire:

```text
invalid input syntax for type uuid: "local-ak47dx"
```

## Comandi Git essenziali

```bash
cd cartella-progetto
npm ci --legacy-peer-deps
npm run build
git add -A
git commit -m "CODM AK47DX V7.1 PWA eventi statistiche uuid fix finale"
git push origin main
```

## Nota importante

Se Supabase dice "Clan Supabase non pronto", fai login con l'admin principale e apri **Gestione utenti**. L'app sincronizza l'owner e il clan AK47DX, poi riprova a creare evento.
