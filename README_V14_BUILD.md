# AK47DX V14.0.0-PRE — BUILD DI SVILUPPO (NON OFFICIAL STABLE)

Sorgente: V13.11.2 fornita dall'utente. Nessuna migrazione o deploy eseguiti sul Supabase reale.

## Implementato
- Migrazione SQL incrementale `supabase/UPDATE_V14_SEASONS_OBJECTIVE_NON_DESTRUCTIVE.sql` con Stagione 1 storica e Stagione 2 attiva; trigger per le nuove partite.
- Filtri Stagione attuale / Carriera / singola stagione in Statistiche e Partite, collegati a `season_id`.
- Esportazione Excel statistiche: nome stagione e nuovo campo TEMPO_OBIETTIVO da dati disponibili.
- Admin > Backup dati: esportazione .json.gz delle tabelle applicative con inventario Supabase Storage, protetta lato server.
- Tournament Center già presente nella baseline e mantenuto.

## NON ancora implementato/validato
- Ripristino automatico completo dal sito: **volutamente disabilitato** perché un ripristino parziale può danneggiare dati e account.
- Il backup web NON esporta file Storage fisici, gli account Auth o i ruoli PostgreSQL. Mantieni backup pgAdmin e download Storage.
- Importatore OCR/Excel Tempo obiettivo e gestione completa nuove stagioni dal pannello admin: ancora da integrare.
- Test end-to-end su Supabase reale, notifiche Telegram e regressione mobile: non eseguiti.
- Quindi questo ZIP è PREVIEW DI SVILUPPO, NON OFFICIAL STABLE.

## Installazione
1. Esegui il backup attuale PostgreSQL via pgAdmin e salva i bucket Storage.
2. Crea un ambiente di prova Supabase e Vercel (preferibilmente) prima del deploy reale.
3. Esegui nel SQL Editor il file `supabase/UPDATE_V14_SEASONS_OBJECTIVE_NON_DESTRUCTIVE.sql`. ATTENZIONE: assegna a Stagione 1 tutti i match senza stagione e attiva Stagione 2; verifica il confine storico prima di eseguirlo in produzione.
4. Configura `.env.local` partendo da `.env.example`, con `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` **solo sul server**.
5. `npm ci --legacy-peer-deps` e `npm run build`; poi `npm run dev` per verificare.
6. Verifica filtri S1/S2/carriera, esportazione statistiche e accesso Admin al backup. Non distribuire in produzione senza collaudo.

## Git
`git add -A` / `git commit -m "V14 preview seasons and backup export"` / `git push origin main` **solo dopo test e approvazione**.
