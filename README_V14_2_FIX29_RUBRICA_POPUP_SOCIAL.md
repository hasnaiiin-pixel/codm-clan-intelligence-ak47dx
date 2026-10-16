# AK47DX V14.2 FIX29 — ADD-ON Rubrica privata / popup / social

Questa è una patch **aggiuntiva** alla FIX29 calendario/mappe/risultati, non la sostituisce e non rinomina il motore.

## Cosa aggiunge
- Pagina protetta `/rubrica` separata da roster, tornei e statistiche.
- Modal unico per **creare, modificare e salvare** schede complete (Nickname CODM, UID, anagrafica, telefono/WhatsApp, compleanno, città, ruolo, stato, gruppo WhatsApp, social, note e URL foto).
- Cambio nickname senza perdere l'UID; storico permanente e ricerca anche per soprannomi precedenti.
- Icone WhatsApp, TikTok, Instagram, Facebook, YouTube, Telegram e Discord quando il collegamento è presente.
- Il pulsante WhatsApp **apre la chat con testo precompilato; non invia automaticamente il messaggio**.
- Permessi per account registrato: accesso iniziale Owner/Amministratore; gli altri soltanto se abilitati da Owner tramite email account, con permessi distinti per telefoni, social, modifiche e archiviazione.
- Chiamate SQL RPC protette e RLS; il sito pubblico e gli utenti non autorizzati non possono leggere la rubrica.
- Archiviazione reversibile a livello dati (in questa patch non c'è ancora una schermata di ripristino).

## Cosa NON fa ancora
- **Non importa automaticamente la rubrica WhatsApp fornita in chat**: contiene numeri di telefono, UID e dati personali, che non sono stati inseriti nello ZIP né nel repository. Inserire le schede dalla pagina privata; l'importazione massiva amministrativa è una funzionalità successiva.
- Le fotografie, in questa patch, sono **URL** modificabili; l'upload file privato richiede una fase separata con Supabase Storage protetto.
- Non realizza ancora l'intero pacchetto V4 (calendario rubrica, notifiche, mappa, export/backup, workflow ripristino).

## Installazione consigliata
1. Fai backup della FIX29 installata.
2. Estrai il contenuto della PATCH **nella radice del progetto**. I percorsi interni ZIP sono direttamente `app/`, `src/`, `supabase/`, `tests/` e `package.json`, non una cartella annidata.
3. Su Supabase SQL Editor **dello stesso progetto usato dal sito**, esegui tutto `supabase/UPDATE_V14_2_FIX29_RUBRICA_POPUP_SOCIAL_PRIVATA.sql`. Esegui una sola volta, dopo le migrazioni di base del Clan Manager. Lo script non modifica tabelle del torneo.
4. Esegui `npm run test:rubrica`, `npm run test:fix29`, `npm run build`.
5. Se la build riesce: `git add -A`, `git commit -m "AK47DX FIX29 Rubrica popup storico e social"`, `git push origin main`.
6. Accedi con account Owner/Amministratore esistente. La voce Rubrica appare nel menu se l'RPC restituisce il permesso `view_contacts`.
7. Crea un contatto di prova, inserisci numero valido, salva, cambia nickname, riapri e verifica storico/WhatsApp.

Se non appare la voce Rubrica, verifica che l'account sia `owner` attivo in `public.clan_members` del clan principale; non aggirare RLS o assegnare lettura pubblica alle tabelle.

## Privacy
Le informazioni della rubrica appartengono a persone reali. Prima di importarle, verifica che l'organizzazione possa raccoglierle e comunicarne l'uso. Non pubblicare numeri, UID, compleanni o immagini personali nel repository GitHub, nelle pagine spettatori o nei PDF pubblici. I permessi non sono solo pulsanti nascosti: la risposta dati è filtrata in SQL.

## Stato test
Test locali del codice e del motore torneo superati. **Build Next.js completa non eseguita in questo ambiente** (dipendenze non presenti); la migrazione e i permessi vanno provati sul database reale prima di usare dati personali.
