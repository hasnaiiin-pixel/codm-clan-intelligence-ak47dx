# AK47DX V14.2 FIX26 — Installazione Windows + Supabase + Vercel

**Base:** FIX25 funzionante, incluse le correzioni TypeScript precedenti. Non applicare questa patch a versioni più vecchie della FIX25.

## 1. Copia e sovrascrivi

1. Fai una copia di sicurezza della cartella del progetto.
2. Estrai lo ZIP PATCH **direttamente nella cartella principale** del progetto, sostituendo i file omonimi. Non creare sottocartelle `patch/` o `fix26/`.
3. Mantieni `.git`, `.env.local`, `.env.production`, `node_modules`, `package-lock.json`, dati locali e file personali.
4. Non serve `npm ci` perché non sono state aggiunte librerie.

## 2. Database Supabase — obbligatorio per i visitatori

Supabase → seleziona progetto collegato al sito → **SQL Editor → New query** → incolla tutto `supabase/UPDATE_V14_2_FIX26_TOURNAMENT_PUBLIC_READ.sql` → **Run**.

- Non eseguire migrazioni di reset, DROP o DELETE.
- Prerequisiti: struttura esistente, migrazioni FIX24/FIX25 (per iscrizioni/privacy), e colonna `score_limit` da FIX20.
- FIX26 crea due funzioni RPC pubbliche `codm_fix26_public_tournaments()` e `codm_fix26_public_tournament(uuid)`; non modifica tabelle o righe.
- Se appare PGRST202, controlla che lo SQL sia stato eseguito sul progetto corretto, poi aggiorna la pagina. Lo script invia il reload della schema cache.
- Il torneo in stato **Bozza** resta fuori dalle pagine pubbliche; cambiando lo stato in Iscrizioni aperte/chiuse o In corso verrà mostrato.
- Le funzioni RPC pubblicano solo nickname/squadre, partite e dati del torneo. Evita di inserire dati anagrafici reali come nomi di squadre o giocatori.

## 3. Test locale (Prompt Windows)

```cmd
cd C:\Users\spea4060_tmv331ef\Documents\PROGETTI\COD\CODM_CLAN_INTELLIGENCE_2_0_DEPLOYABLE_PWA_YOLO_AK47DX
npm run test:bracket64
npm run test:fix25
npm run test:fix26
npm run build
```

## 4. Pubblicazione (solo se la build riesce)

```cmd
git add -A
git commit -m "AK47DX V14.2 FIX26 tornei pubblici e tabellone dinamico"
git push origin main
```

Controlla Vercel → Deployments → Production. Apri `https://<tuo-dominio>/version` e verifica **FIX26**.

## 5. Collaudo funzionale

1. Apri `/tornei` da browser anonimo: devono comparire solo i tornei pubblicati, senza login.
2. Apri `/tornei/<id>`: verifica Stato, Squadre, Gironi, Eliminazione, Calendario e Risultati; nel browser non devono arrivare cognome, nome reale, UID o richieste privacy.
3. Crea torneo 2v2 con 24 iscritti confermati; componi **12 squadre** e verifica 12 concorrenti + 4 BYE nel tabellone eliminazione diretta.
4. Crea un secondo torneo 5v5: selezionandolo, NON devono comparire i 24 iscritti o le squadre del 2v2.
5. Da due browser, inserisci un risultato con lo staff: il visitatore deve vedere i nuovi punteggi automaticamente (Realtime se disponibile, altrimenti entro circa 20 secondi o al ritorno nella scheda).
6. Verifica che PWA mobile non richieda F5; se il browser mantiene codice vecchio apri `/cache-reset` una volta.
7. Prova export Excel/PDF esclusivamente sul torneo selezionato; conserva i risultati dei tornei storici.

**Nessuna certificazione di sicurezza è implicita nei test locali:** testa i permessi RLS e la RPC su Supabase reale prima di divulgare i link. Non condividere i dati anagrafici degli iscritti.
