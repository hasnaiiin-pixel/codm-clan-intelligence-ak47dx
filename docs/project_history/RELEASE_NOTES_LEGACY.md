# AK47DX — Archivio storico versioni precedenti

Note originarie delle build V12–FIX24 consolidate nella FIX25. Questo file è un archivio, non le istruzioni di installazione correnti.


---
## README_V12_1_IMPORT_EXCEL_FOTO_PROFILI.md

# CLAN MANAGER V12.1 - Import Excel + Foto prova + Profili reali

Flusso consigliato:

1. Dai a ChatGPT le foto delle partite.
2. ChatGPT prepara Excel con ID_PARTITA, risultato, player, K/D/A, MVP e nome foto.
3. In app vai su Import partita.
4. Carica Excel.
5. Non serve OCR se Excel è già compilato.
6. Allega foto prova accanto alla tabella oppure dopo caricando la partita registrata.
7. Abbina i player ai profili reali registrati con il menu Profilo reale/email.
8. Salva o aggiorna la partita su Supabase.

File utili:

- public/templates/TEMPLATE_IMPORT_RISULTATI_CODM_CLAN_MANAGER_V12_1_FOTO_PROFILI.xlsx
- supabase/UPDATE_V12_1_PHOTO_PLAYER_LINK_SUPPORT.sql
- supabase/IMPORT_RISULTATI_EXCEL_STAGING_V12.sql

Note:

- FOTO_FILE serve per ricordare il nome del file prova. La foto va allegata manualmente dalla app oppure può essere indicata con FOTO_URL.
- GIOCATORE_EMAIL e UID_CODM permettono l'abbinamento automatico al profilo registrato.
- Se l'abbinamento automatico non trova il player, puoi assegnarlo manualmente dalla tabella import.


---
## README_V13_10_1_BUILD_IMPORT_FIX.md

# V13.10.1 - Fix build GlobalTableSorter

Correzione del build Vercel: il componente GlobalTableSorter è stato spostato dentro `app/GlobalTableSorter.tsx` e importato con percorso relativo, perché la regola `.gitignore` `components/` poteva escludere `src/components` dal commit Git.

Nessuna modifica funzionale rispetto alla V13.10.


---
## README_V13_10_CHART_SORT_PWA.md

# CLAN MANAGER AK47DX V13.10

## Modifiche
- Ogni grafico mantiene una tipologia indipendente: Torta, Ciambella o Barre.
- Tutte le tabelle principali dell'app diventano ordinabili cliccando sulle intestazioni.
- Primo clic: crescente. Secondo clic: decrescente.
- Supporto tastiera Enter/Spazio e indicatore visivo ▲/▼.
- Ottimizzazione PWA: tabelle compatte, scorrimento touch, grafici a colonna singola e safe-area inferiore.
- K/D/A invariato: Kill / Death / Assist.

## Installazione
```bash
npm ci --legacy-peer-deps
npm run build
```

## Git
```bash
git add -A
git commit -m "V13.10 grafici indipendenti ordinamento tabelle PWA"
git push origin main
```


---
## README_V13_11_1_PAGE_VIEW_TRACKER_BUILD_FIX.md

# CLAN MANAGER AK47DX V13.11.1

Correzione build Vercel per il componente di analytics visite.

## Correzione

- `PageViewTracker` spostato in `app/PageViewTracker.tsx`.
- Import aggiornato in `app/layout.tsx` con percorso relativo.
- Rimossa da `.gitignore` la regola generica `components/`, che poteva escludere nuovi componenti dal commit Git.
- Nessuna modifica alla logica di statistiche, eventi, Telegram, fondo estrazioni, K/D/A, OCR o import risultati.

## Verifica

Eseguire:

```bash
npm ci --legacy-peer-deps
npm run build
```


---
## README_V13_11_2_TOUCH_SORT_CHART_WHATSAPP_FIX.md

# CLAN MANAGER AK47DX V13.11.2

Patch mirata sopra V13.11.1.

## Correzioni
- Ordinamento tabelle funzionante anche su PWA/mobile e su tabelle caricate dopo la pagina.
- Indicatore ordinamento touch visibile: ↕, ↑, ↓.
- Primo tocco crescente, secondo tocco decrescente.
- Selezione dei grafici annullabile toccando nuovamente grafico/legenda o il pulsante `✕ Togli`.
- Messaggi WhatsApp statistiche ed eventi riorganizzati con simboli e sezioni.
- Rimossi tutti i link dell’app dai messaggi WhatsApp e dalla Web Share API.
- K/D/A invariato: Kill / Death / Assist.

## SQL
Non serve nuovo SQL.

## Deploy
```bash
cd cartella-progetto
npm ci --legacy-peer-deps
npm run build
git add -A
git commit -m "V13.11.2 ordinamento mobile grafici WhatsApp"
git push origin main
```


---
## README_V13_11_SHARE_VISITORS_FUND.md

# CLAN MANAGER AK47DX V13.11

## Modifiche principali

### Statistiche condivisibili
- Esportazione Excel dei dati filtrati.
- Esportazione Excel completa.
- Condivisione riepilogo su WhatsApp.
- Condivisione/scaricamento immagine del riepilogo.
- I file non includono email o UID privati.

### Eventi WhatsApp
- Ogni evento può essere condiviso su WhatsApp con data, ora, avversario, mappe, modalità e link alla pagina Eventi.
- La condivisione apre WhatsApp e l'utente sceglie il gruppo; non usa automazioni non ufficiali.

### Analytics visitatori admin
Pagina: `/admin/visitors`
- Visualizzazioni.
- Visitatori unici.
- Utenti registrati.
- Accessi PWA e mobile.
- Andamento giornaliero.
- Pagine più viste e dispositivi.
- Nessun indirizzo IP viene memorizzato.

### Fondo estrazioni
Pagina: `/fund`
- Quota mensile configurabile.
- Partecipanti collegati ai player CODM.
- Preferenza arma e rarità Leggendaria/Mitica.
- Quote Pagato / Non pagato / Esente.
- Estrazione casuale tra i soli partecipanti idonei.
- Chi è già stato estratto non può essere scelto di nuovo fino al completamento del giro.
- Storico, numero degli idonei e prova casuale salvata.
- L'app non elabora o custodisce pagamenti reali.

## SQL obbligatorio
Eseguire una sola volta:

`supabase/UPDATE_V13_11_SHARE_VISITORS_FUND.sql`

## Installazione e deploy

```bash
cd cartella-progetto
npm ci --legacy-peer-deps
npm run build
git add -A
git commit -m "V13.11 condivisione analytics visitatori fondo estrazioni"
git push origin main
```

Dopo il deploy aprire `/cache-reset` oppure chiudere e riaprire la PWA.


---
## README_V13_1_EVENTS_STATS_USERS_TELEGRAM_GROUP.md

# CLAN MANAGER AK47DX V13.1

Base stabile: `V13_GENERIC_EVENT_HOME_PWA_HORIZONTAL`.

## Cosa è stato modificato

- `/events`: la prima sezione ora è **Eventi da fare**. Appena entri in Eventi li vedi in alto.
- `/events`: archivio sotto impostato su **Passati automatici** in base alla data/ora.
- `/events`: anche sugli eventi passati restano disponibili i pulsanti per **Inserisci risultato** per ogni partita.
- `/analytics` e `/players`: tabelle statistiche più strette, colonne numeriche compatte.
- K/D/A non è stato modificato: rimane **Kill / Death / Assist**.
- `/analytics`: rimosso grafico **Ranking 1–5**.
- `/admin/users`: aggiunta associazione manuale account registrato ↔ player CODM.
- `/admin/users`: aggiunti permessi granulari con flag.
- Telegram: aggiunto invio anche a gruppo clan tramite `TELEGRAM_GROUP_CHAT_ID`.

## SQL da eseguire su Supabase

Esegui una volta:

```sql
-- file incluso nel pacchetto
supabase/UPDATE_V13_1_USER_PERMISSIONS.sql
```

Serve per aggiungere `clan_members.permissions` e assicurare `players.user_id`.

## Variabili Vercel Telegram

```env
TELEGRAM_BOT_TOKEN=token_bot
TELEGRAM_CHAT_ID=chat_id_privato_admin
TELEGRAM_GROUP_CHAT_ID=-100xxxxxxxxxx
CRON_SECRET=segreto_cron
```

`TELEGRAM_CHAT_ID` resta per test/admin.
`TELEGRAM_GROUP_CHAT_ID` è il gruppo clan dove devono arrivare gli eventi.

## Test consigliati

```bash
npm ci --legacy-peer-deps
npm run build
```

Poi visita:

```text
/api/telegram/status
/api/telegram/test?secret=CRON_SECRET
```

## Comandi Git essenziali

```bash
cd cartella-progetto
npm ci --legacy-peer-deps
npm run build
git add -A
git commit -m "V13.1 fix eventi statistiche utenti telegram gruppo"
git push origin main
```


---
## README_V13_2_STATS_EVENTS_PLAYERS_TELEGRAM_GROUP_FIX.md

# CLAN MANAGER AK47DX - V13.2

Base stabile: **V13 / V13.1**. Patch mirata, senza modificare import risultati/OCR e senza cambiare il significato di K/D/A.

## Cosa cambia

- **Statistiche**
  - `Partite` ora conta le partite uniche giocate, non le righe della tabella giocatori.
  - K/D/A resta **Kill / Death / Assist**.
  - Intestazioni tabella più corte e a capo.
  - Righe verticali tra colonne per leggere meglio i numeri.
  - Rimossa la parte grafico Ranking 1-5.

- **Eventi**
  - In Home ora gli eventi da fare sono visibili subito in alto.
  - In pagina Eventi la prima sezione è sempre `Eventi da fare / partite programmate`.
  - Eventi passati vengono messi sotto in automatico in base a data/ora e stato.
  - Anche negli eventi passati resta possibile inserire o modificare risultato.

- **Utenti / player**
  - In Admin > Utenti la lista di associazione mostra player già presenti nel roster e nomi trovati nelle statistiche/import.
  - Se il player esiste solo nelle statistiche, selezionandolo viene creato automaticamente in `players` e associato all'account registrato.
  - I permessi granulari restano gestibili con flag.

- **Giocatori**
  - Clic sul nome giocatore apre il profilo personale `/players/[id]`.
  - Profilo con dati roster, snapshot profilo e storico partite con Kill / Death / Assist.

- **Telegram**
  - Invio a chat privata/admin + gruppo clan.
  - Variabile consigliata: `TELEGRAM_GROUP_CHAT_ID=-100xxxxxxxxxx`.
  - Alias supportati: `TELEGRAM_CLAN_GROUP_CHAT_ID`, `TELEGRAM_GROUP_ID`, `TELEGRAM_CHAT_ID_GROUP`.

## SQL Supabase

Eseguire in Supabase SQL Editor se non è già stato fatto con V13.1:

```text
supabase/UPDATE_V13_2_STATS_PLAYERS_EVENTS_TELEGRAM.sql
```

Lo script è idempotente: aggiunge solo colonne/indici mancanti per permessi e associazione account-player.

## Configurazione Telegram gruppo

1. Aggiungi il bot nel gruppo Telegram AK47DX.
2. Metti il bot admin o almeno con permesso di scrivere.
3. Nel gruppo scrivi `/start@NomeTuoBot`.
4. Apri:

```text
https://api.telegram.org/bot<TUO_TOKEN>/getUpdates
```

5. Cerca il `chat.id` del gruppo, di solito negativo tipo:

```text
-1001234567890
```

6. Su Vercel imposta:

```env
TELEGRAM_BOT_TOKEN=token_bot
TELEGRAM_CHAT_ID=chat_privata_admin
TELEGRAM_GROUP_CHAT_ID=-1001234567890
CRON_SECRET=tuo_secret
SUPABASE_SERVICE_ROLE_KEY=service_role_key
```

7. Dopo il deploy verifica:

```text
/api/telegram/status
/api/telegram/test?secret=TUO_CRON_SECRET
```

Se `/api/telegram/status` non mostra target `group`, la variabile ambiente gruppo non è stata salvata o il deploy non è stato rifatto.

## Comandi deploy

```bash
cd cartella-progetto
npm ci --legacy-peer-deps
npm run build
git add -A
git commit -m "V13.2 fix statistiche eventi player telegram gruppo"
git push origin main
```

## Verifica post deploy

- Home: eventi da fare visibili subito sopra le card principali.
- Eventi: sezione `Eventi da fare / partite programmate` in alto.
- Eventi passati: pulsante inserimento risultato disponibile.
- Statistiche: colonna `Partite`, non `Righe`.
- Giocatori: clic su nome apre profilo personale.
- Admin utenti: tendina player include anche `da statistiche/crea player`.
- Telegram: test arriva sia in chat privata sia nel gruppo.


---
## README_V13_3_ADMIN_PLAYER_TELEGRAM_OPPONENT_FIX.md

# CLAN MANAGER AK47DX V13.3 - Admin player, Telegram gruppo, nome avversario

Base: V13.2 stabile. Patch mirata senza toccare import/OCR/Kill Death Assist.

## Modifiche incluse

1. Admin principale associabile a player reale
- L’account admin principale resta Owner, non cancellabile e con permessi completi.
- Ora però in Admin > Utenti puoi cambiare anche la sua associazione account -> player CODM.
- Se attualmente è collegato a un nome senza statistiche, seleziona il player corretto con statistiche.
- Il sync Auth non deve più sovrascrivere nickname/UID di un player già collegato manualmente.

2. Telegram gruppo
- Invio eventi/test verso tutti i target configurati: privato + gruppo.
- Supporta più variabili: TELEGRAM_GROUP_CHAT_ID, TELEGRAM_CLAN_GROUP_CHAT_ID, TELEGRAM_GROUP_ID, TELEGRAM_CHAT_ID_GROUP.
- Supporta anche più chat id separati da virgola, es. TELEGRAM_CHAT_ID=123456789,-1009876543210.
- /api/telegram/status ora mostra targetCounts private/group.
- /api/telegram/test accetta target=group, target=private o target=all.

3. Eventi - avversario libero
- Il campo non viene più forzato a “Avversario / Organizzatore”.
- Aggiunto campo visibile “Nome avversario / organizzatore”.
- Puoi scrivere il nome che vuoi tu.
- Se lo lasci vuoto, non viene salvato un falso clan avversario.

## SQL
Eseguire una volta:

supabase/UPDATE_V13_3_ADMIN_PLAYER_LINK.sql

## Telegram test
Dopo deploy:

/api/telegram/status
/api/telegram/test?secret=TUO_CRON_SECRET&target=group
/api/telegram/test?secret=TUO_CRON_SECRET&target=all

Se target=group non arriva nel gruppo, controllare:
- TELEGRAM_GROUP_CHAT_ID su Vercel è presente e in Production/Preview corretto.
- Hai fatto Redeploy dopo aver salvato la variabile.
- Il bot è dentro il gruppo.
- Il bot può inviare messaggi.
- Chat ID gruppo deve essere negativo tipo -100xxxxxxxxxx per supergruppi privati.

## Verifica locale

npm ci --legacy-peer-deps
npx tsc --noEmit
npm run build


---
## README_V13_4_REGISTRATION_CONFIRMATION_FIX.md

# V13.4 - Fix conferma registrazione

## Correzione
- Dopo la creazione account viene mostrata una pagina valida "Registrazione completata" invece di una rotta 404.
- Il link email apre `/auth/callback` e mostra "Iscrizione confermata".
- Aggiunte rotte compatibili `/auth/confirm` e `/confirmed` per evitare 404 con configurazioni o link precedenti.

## Supabase Auth
In Authentication > URL Configuration impostare:
- Site URL: URL pubblico Vercel, senza slash finale.
- Redirect URLs:
  - `https://TUO-DOMINIO.vercel.app/auth/callback`
  - `https://TUO-DOMINIO.vercel.app/auth/confirm`
  - `https://TUO-DOMINIO.vercel.app/confirmed`

Su Vercel impostare:
`NEXT_PUBLIC_APP_URL=https://TUO-DOMINIO.vercel.app`

Dopo ogni modifica alle variabili Vercel fare Redeploy.


---
## README_V13_5_PLAYER_EMAIL_STATS_ASSOCIATION_FIX.md

# CLAN MANAGER AK47DX V13.5

Patch mirata sopra V13.4.

## Correzioni
- In Giocatori lo stato Account associato / Da associare usa `players.user_id`, non `uid_codm`.
- L'Owner/Admin può associare direttamente ogni player a una email registrata dalla tabella Giocatori.
- L'associazione collega l'account al player già contenente le statistiche, senza creare un profilo statistico vuoto.
- Email collegata visibile sotto lo stato account.
- Numero Partite calcolato su `match_id` unici.
- Tabella Giocatori corretta per evitare sovrapposizioni tra stato account e numero partite.
- K/D/A resta Kill / Death / Assist.

## Uso
1. Accedere come Owner/Admin.
2. Aprire Giocatori.
3. Nella colonna Associa email registrata selezionare l'email.
4. Premere Associa sulla stessa riga del player che possiede le statistiche.
5. Lo stato diventa Account associato e le statistiche restano visibili sulla stessa riga/profilo.

Non richiede nuovo SQL se sono già stati eseguiti gli aggiornamenti V13.1/V13.3 che aggiungono `players.user_id`.


---
## README_V13_6_PLAYER_NAME_EDIT.md

# CLAN MANAGER AK47DX V13.6

Patch mirata sopra V13.5.

## Modifica inclusa

Nella pagina **Giocatori**, Owner/Admin/Staff con permessi di scrittura può modificare il nome del giocatore direttamente nella riga del player.

La modifica aggiorna solo `players.nickname` e mantiene invariati:
- ID del player;
- account email associato (`user_id`);
- statistiche già registrate;
- storico partite;
- UID CODM;
- clan e ruoli.

Sono presenti controlli per nome vuoto e duplicato.

## Installazione

```bash
npm ci --legacy-peer-deps
npm run build
```

Non serve SQL aggiuntivo.


---
## README_V13_7_DEFINITIVA_MAP_STATS_PLAYER_TABLE.md

# CLAN MANAGER AK47DX V13.7 DEFINITIVA

Base: V13.6 funzionante.

## Modifiche
- Tabella Giocatori riorganizzata in 9 colonne compatte: Player, Clan, Account, Partite, Vittorie/WR%, Kill-Death-Assist/KD, Medaglie/posizione media, associazione email, modifica player.
- Tutte le azioni restano disponibili: associa email, modifica nome, modifica clan, apertura profilo personale.
- Migliori giocatori per mappa aggiunti in Statistiche.
- Classifica Top 5 per ogni mappa con Partite, W/WR, Kill/Death/Assist, K/D, MVP e posizione media.
- Il migliore per mappa usa un punteggio bilanciato e, quando possibile, richiede almeno 2 partite per ridurre risultati falsati da una singola partita.
- K/D/A resta sempre Kill / Death / Assist.

## Installazione e deploy
```bash
cd cartella-progetto
npm ci --legacy-peer-deps
npm run build
git add -A
git commit -m "V13.7 definitiva statistiche mappe e tabella giocatori"
git push origin main
```

## Verifica
- Aprire Statistiche e controllare la sezione "Migliori giocatori per mappa".
- Aprire Giocatori e verificare associazione email, modifica nome, modifica clan e profilo cliccabile.
- Controllare che Partite indichi partite uniche e K/D/A mantenga Kill, Death, Assist.

Non serve nuovo SQL Supabase per questa versione.


---
## README_V13_8_PLAYER_TABLE_MAP_FILTER_EVENTS_CANCELLED.md

# CLAN MANAGER AK47DX V13.8

Base: V13.7 definitiva.

## Modifiche
- Tabella Giocatori più compatta e allineata.
- Account e associazione email con colonne più corte.
- Modifica nome/clan ridotta e sempre sulla riga corretta.
- Medaglie Oro, Argento e Bronzo in colonne separate.
- Statistiche mappe in una sola tabella.
- Filtri Mappa e Modalità nella pagina Statistiche.
- Eventi da fare soltanto in alto.
- Eventi passati nello storico automatico.
- Nuovo stato e comando Annulla evento.
- Eventi annullati separati e non mostrati tra quelli da fare.

K/D/A resta Kill / Death / Assist.

## Database
Non è richiesto nuovo SQL Supabase.

## Installazione
npm ci --legacy-peer-deps
npm run build


---
## README_V13_9_INTERACTIVE_CHARTS_FILTERS_COMPACT_PLAYERS.md

# V13.9 – Grafici interattivi, filtri mappa/modalità, tabella player compatta

## Modifiche
- Grafici statistiche interattivi: clic su legenda/voce per mostrare etichetta, valore e percentuale.
- Tipo grafico selezionabile: Torta, Ciambella, Barre.
- Filtri Mappa e Modalità riportati anche direttamente sopra la classifica per mappa, con pulsante Azzera filtri.
- Tabella classifica: colonne Player e Clan ridotte.
- Tabella giocatori: larghezza totale ridotta; Account, Associa email e Modifica player più compatti.
- Email completa disponibile come tooltip del selettore; testo compatto nella cella.
- Stato sotto il player corretto: se esiste user_id mostra “Profilo account collegato”; non mostra più erroneamente “profilo CODM da collegare”.
- K/D/A invariato: Kill / Death / Assist.

## Database
Non serve nuovo SQL Supabase.

## Comandi
cd cartella-progetto
npm ci --legacy-peer-deps
npm run build
git add -A
git commit -m "V13.9 grafici interattivi filtri e tabella player compatta"
git push origin main


---
## README_V13_GENERIC_EVENT_HOME_PWA_HORIZONTAL.md

# CLAN MANAGER AK47DX — V13 Generic Event + Home + PWA Horizontal

Questa release parte dalla V12.1 e modifica solo le aree richieste, senza cambiare il flusso funzionante di import Excel, foto prova e profili reali.

## Modifiche incluse

- Evento generico leggero: nome evento, data/ora, descrizione, stato evento, cover, logo nostro clan e logo avversario/organizzatore.
- Flag “Aggiungi partite in una fase successiva” attivo di default.
- Evento salvabile anche senza partite, convocati, titolari, riserve, BAN o risultati.
- In modifica evento è possibile aggiungere la prima partita, aggiungere altre partite o togliere partite.
- Eventi da fare in PWA con presentazione orizzontale: logo nostro clan → VS → logo avversario.
- Home più ricca graficamente: hero gaming, logo clan, accessi rapidi, prossimo evento, card riepilogo e barre modalità.
- Menu bottom PWA su una sola riga con 6 voci.

## Installazione locale

```bash
cd CLAN_MANAGER_AK47DX
npm ci --legacy-peer-deps
npm run build
npm start
```

## Deploy GitHub / Vercel

```bash
cd CLAN_MANAGER_AK47DX
npm ci --legacy-peer-deps
npm run build
git add -A
git commit -m "CLAN MANAGER V13 generic event home pwa horizontal"
git push origin main
```

## Verifica rapida

1. Aprire `/events`.
2. Premere “Aggiungi evento”.
3. Inserire solo nome, data/ora, descrizione, stato, cover e loghi.
4. Lasciare attivo “Aggiungi partite in una fase successiva”.
5. Salvare: l’evento deve comparire senza obbligo di partite.
6. Riaprire l’evento e premere “+ Aggiungi partita”.
7. Su PWA mobile verificare che il blocco evento resti orizzontale: logo nostro clan, VS, logo avversario.
8. Su Home verificare le nuove card grafiche e il menu basso su una sola riga.


---
## README_V14_1_FIX3_VERCEL.md

# AK47DX V14.1 FIX3 — Correzione errore Vercel TypeScript

**Problema**: app/import/match/page.tsx riga 1591 — Property 'match_scope' does not exist on type '{ id: string }'.

**Soluzione**: rimosso il controllo su match.match_scope dopo il salvataggio. Quel controllo era sia mal tipizzato (oggetto con solo id) sia posizionato in modo scorretto: poteva segnalare errore a partita già salvata. Il controllo che impedisce di modificare una serie come partita singola resta in loadExistingMatchForEdit(), dove viene letta la riga completa dal database.

## Applicare la patch
1. Estrai il presente ZIP.
2. Copia app/import/match/page.tsx nella cartella app/import/match/ del tuo repository Git, sovrascrivendo il file.
3. Esegui npm ci --legacy-peer-deps e npm run build.
4. Se il build locale supera tutti i controlli, esegui git add -A, git commit -m "AK47DX V14.1 FIX3 match scope" e git push origin main.

Non eseguire script SQL: questa patch cambia solo codice frontend.
Non sovrascrivere file .env, né ripubblicare il backup. La patch presuppone che tu abbia già FIX1 e FIX2.

Verifiche in ambiente di preparazione: sintassi TS/TSX (75 file), controllo posizione guard e flusso di salvataggio. Non certificato un build Next.js completo: dipendenze npm non scaricabili nell'ambiente di preparazione.


---
## README_V14_1_FIX5_CONTROL_IMPORT.md

# AK47DX V14.1 FIX5 — Import risultati modalità Controllo

## Problema osservato
Nell'importatore Risultati Storici funzionano CED, Postazione e Dominio, ma il salvataggio di Controllo viene rifiutato.

## Modifica
- Il selettore continua a mostrare **CONTROLLO**, ma il backend archivia **CONTROL**, codice gia' presente nel catalogo SQL originale (`supabase/FINAL_SCHEMA_CLAN_MANAGER.sql`) e usato in Eventi e Tornei.
- Accetta sia CONTROLLO sia CONTROL dalle importazioni Excel e dagli altri client.
- Statistiche e Archivio visualizzano **Controllo** e accorpano entrambi i codici nei filtri senza modificare i record esistenti.
- Anche Importa Partita (con K/D/A) usa lo stesso codice persistito.
- Gli errori di Supabase durante l'import storico mostrano ora il codice database per individuare ulteriori problemi.
- FIX5 BUILD completa comprende il modello Excel della FIX4.

**Migrazioni SQL:** nessuna per questa correzione. Nessun UPDATE/DELETE dei record storici.

## Test consigliati
1. Prova una sola partita Controllo nella schermata Importa > Risultati storici scegliendo una stagione storica, clan avversario e 3-1.
2. Verifica Archivio Partite filtrando Modalità=Controllo, in Carriera o nella stagione storica.
3. Verifica Statistiche in Carriera e per stagione/modalità.
4. Importa una partita Postazione/DOMINIO/CED per test regressivo.
5. Se appare ancora errore, annota il messaggio Supabase completo e il codice tra parentesi: potrebbe esserci un vincolo personalizzato assente dal sorgente SQL disponibile.

## Note compilazione
L'integrita' ZIP e i controlli statici sono stati eseguiti. La `next build` completa non e' certificata in questo ambiente senza dipendenze npm installate.

## Deploy Git / Vercel

```powershell
cd "C:\PERCORSO\CLAN_MANAGER_AK47DX"
npm ci --legacy-peer-deps
npm run build
git add -A
git commit -m "AK47DX V14.1 FIX5 Control risultato storico"
git push origin main
```


---
## README_V14_1_FIX6_TORNEI_TEMPO.md

# AK47DX V14.1 TEST — FIX6: iscrizioni tornei + Tempo obiettivo statistiche

**Base:** V14.1 TEST FIX5 (CONTROLLO) — fix cumulativo nella build completa, patch incrementale nella patch ZIP.
**Status:** test, NON Official Stable. Migrazioni dati: nessuna nuova.

## Modifiche

1. `/tournament` Iscrizioni: ricerca nickname da `players`, righe storiche alleate `match_scoreboard_rows` (incluse senza team_side definito) e `codm_tournament_registrations`; paginazione per superare limite 1000 righe; caricamento ripetuto dopo login e pulsante «Aggiorna elenco»; spiegazione visibile se manca accesso o la lista è vuota. Gli avversari `ENEMY` nelle righe storico sono esclusi. Si possono aggiungere giocatori esterni manualmente. I nomi nel selettore squadre includono anche i giocatori del roster.
2. `/analytics` Tempo obiettivo per giocatore in **Postazione, Dominio, Controllo** (alias DB CONTROL), con totale, media, massimo e numero partite, filtrati per stagione, clan, mappa e modalità. I dati provengono da scoreboard con fallback a match_player_stats; prevenzione dei doppi conteggi tra le due tabelle. Nuova colonna «Tempo obiettivo» nella classifica Top player solo quando pertinenti; nessuna metrica di tempo per CED e altre modalità. Esportazione delle righe Excel: Tempo obiettivo vuoto per le altre modalità.
3. `/players/[id]` Profilo: riepilogo tempi separati delle tre modalità, con totale e media.
4. `/import/match` Campo Tempo obiettivo visibile e salvato SOLO in Postazione, Dominio e Controllo. Non è più visibile né registrato per le altre modalità; un valore lasciato da una modalità precedente non passa in quelle non supportate.

## Presupposti DB

La migrazione V14 iniziale deve avere creato `objective_time_seconds`, `objective_time_text` su `match_scoreboard_rows` e `match_player_stats`. **FIX6 NON richiede SQL aggiuntivo**. Non eseguire `FINAL_SCHEMA_CLAN_MANAGER.sql` o reset: potrebbero riscrivere configurazioni esistenti.

I tempi compariranno SOLO se le importazioni hanno effettivamente salvato il tempo per ogni giocatore. Non si possono calcolare retroattivamente dagli screenshot senza nuova lettura o correzione.

## Installazione (PATCH)

1. Salva/archivia una copia del progetto Git e verifica il backup del database e Storage.
2. Estrarre `CODM_AK47DX_V14_1_FIX6_PATCH_TORNEI_TEMPI_STATS.zip` e copiare le cartelle `app` nel repository mantenendo i percorsi dei file. Conserva `.git` e `.env.local` senza sovrascriverli.
3. Dal terminale (PowerShell):

```powershell
cd "C:\PERCORSO\CLAN_MANAGER_AK47DX"
npm ci --legacy-peer-deps
npm run build
```

4. SOLO se la build riesce:

```powershell
git add -A
git commit -m "AK47DX V14.1 FIX6 torneo roster e tempo obiettivo stats"
git push origin main
```

5. Controllare il deploy su Vercel.

## Test manuali fondamentali

- Accedere come Staff/Admin, aprire Tornei → Iscrizioni. Nella ricerca digitare il nome di un giocatore esistente: deve apparire nell'elenco. Scegliere il nickname e aggiungerlo. Provare «Aggiorna elenco» e un giocatore presente solo in una partita storica.
- Verificare che un nickname avversario (`ENEMY`) non appaia per la sola origine delle righe storico.
- Aprire Statistiche, impostare Stagione 2 → Postazione. Se è stata importata una partita con `01:35`, verificare 01:35 nel totale (o somma con altre partite), media e dettaglio giocatore. Ripetere Dominio e Controllo.
- Selezionare CED: la sezione Tempo obiettivo e la colonna dedicata nella classifica NON devono apparire.
- Importa Partita: passare da Postazione a CED, salvare: il tempo non deve essere salvato nel record CED anche se precedentemente compilato.
- Verificare ancora creazione squadre 2VS2 e vecchie statistiche S1/S2.

## Verifica tecnica

Controllo di parsing TypeScript/TSX dell'intero codice superato (75 file, nessun errore sintattico). `npm ci --offline` non ha trovato i pacchetti nella cache e `npm ci` online non è terminato nell'ambiente di creazione. Non è quindi stato possibile verificare il `next build` completo né la connessione al database personale. **Non pubblicare come Official Stable senza passare `npm run build` e i test indicati.**


---
## README_V14_1_FIX7_CONTROLLO_DIAGNOSTICA.md

# AK47DX V14.1 TEST FIX7 — Salvataggio Controllo con diagnostica completa

## Problema osservato
Quando si sceglie CONTROlLO in **Importa partita** e si preme Salva, l'interfaccia precedente riportava i messaggi solamente in alto. Alcuni errori dopo l'inserimento (es. salvataggio statistiche/evento) erano segnalati come se l'intera partita non fosse stata salvata, esponendo al rischio di duplicazioni. Le correzioni FIX5/FIX6 non hanno risolto il problema per il database dell'utente.

## Interventi FIX7
- Stato salvataggio ed errori visibili **subito sotto il pulsante Salva**, con fase e dettagli Supabase `code/message/details/hint`.
- Validazione del Tempo obiettivo `mm:ss` con **numero riga e nickname**: un valore non valido blocca il salvataggio e mostra esattamente il motivo.
- Compatibilità UI `CONTROL` / `CONTROLLO`: CONTROL sul database è ancora il primo valore tentato. Se un CHECK/enum della modalità rifiuta esplicitamente CONTROL, si ritenta una sola volta `CONTROLLO`, solo dopo il rifiuto (nessun doppio INSERT a seguito di un salvataggio riuscito).
- ID partita registrato immediatamente dopo la risposta positiva Supabase, prima delle statistiche: protegge da duplicati in caso di errore successivo.
- Errori sulle righe statistiche, screenshot/log e classifiche evidenziati come **salvataggio parziale**, non nascosti dietro una conferma generica.
- Errori di aggiornamento evento collegato e ricaricamento lista non possono più far dichiarare erroneamente fallito il salvataggio della partita già persistita.
- Errore caricamento screenshot non più ignorato: viene mostrato prima di salvare la partita.
- SQL di diagnosi in `supabase/DIAGNOSTICA_FIX7_CONTROLLO_SOLO_LETTURA.sql` (SOLO SELECT; facoltativo).

## Installazione
Sostituire `app/import/match/page.tsx` con quello presente nella PATCH; non occorrono SQL/migrazioni per FIX7.

```powershell
cd "C:\\PERCORSO\\CLAN_MANAGER_AK47DX"
npm ci --legacy-peer-deps
npm run build
git add -A
git commit -m "AK47DX V14.1 FIX7 diagnostica salvataggio Controllo"
git push origin main
```

**Non effettuare il push se `npm run build` fallisce.** La build completa non è stata verificata in quest'ambiente, per indisponibilità delle dipendenze npm.

## Collaudo senza duplicati
1. Aprire **Importa partita**, selezionare Controllo e compilare almeno una riga giocatore con dati reali.
2. Verificare i tempi `mm:ss` o lasciare vuoto.
3. Premere Salva una volta sola e guardare il messaggio **sotto** il pulsante.
4. **Successo**: partita + righe confermate. **Avviso parziale**: partita già registrata, controllare le righe in Archivio. **Errore**: nessuna conferma database, copiare il messaggio visualizzato.
5. Se esiste un record con la stessa data/punteggio in Archivio, non crearne un secondo: scegliere Modifica partita già registrata.
6. Se il messaggio contiene `23514`, consultare la query SELECT allegata per identificare il vincolo, senza fare modifiche al database.

## Verifiche
Sorgente testato con parser TypeScript locale e revisione statica del flusso. Nessuna prova diretta su Supabase di produzione; FIX7 è una **versione TEST**, non una garanzia di correzione della configurazione del database.


---
## README_V14_1_FIX8_TYPESCRIPT_TORNEO.md

# AK47DX V14.1 TEST — FIX8 TypeScript Tornei

## Motivo
Vercel compilava Next.js ma bloccava il controllo TypeScript in `app/tournament/page.tsx` riga 135: `Property team_side does not exist on type GenericStringError`.

Il selettore del torneo interroga tabelle Supabase usando un elenco di colonne dinamico. Il parser dei tipi di Supabase non puo dedurre la forma delle righe da una stringa dinamica.

## Correzione
- Prima di accedere a `team_side` si verifica che `data` sia un array e le righe sono considerate oggetti con campi dinamici (`Record<string, unknown`).
- Si mantiene il filtro `ENEMY` per non proporre avversari tra gli iscritti.
- Il caricamento di roster, statistiche storiche e iscrizioni precedenti rimane invariato.
- Non vengono alterati database, risultati, SQL, stagioni o statistiche.

## Installazione patch
1. Estrai lo ZIP nella cartella sorgente del progetto, mantenendo la struttura delle directory.
2. Sostituisci `app/tournament/page.tsx`.
3. Da PowerShell, nella cartella del progetto, esegui:

```powershell
npm ci --legacy-peer-deps
npm run build
```

4. Soltanto se la build passa:

```powershell
git add -A
git commit -m "AK47DX V14.1 FIX8 TypeScript torneo"
git push origin main
```

## Verifica
- Accedi a Tornei -> Iscrizioni e prova ricerca e selezione di giocatori.
- Verifica che il sistema non suggerisca avversari, e che i nomi dei giocatori importati siano disponibili.
- Se la lista resta vuota, controlla avviso sulle tabelle e permessi RLS.
- Se Vercel mostra un nuovo errore TypeScript, riportare il primo blocco di errore.

### Collaudo
Controllati i parser TypeScript dei sorgenti e integrita degli ZIP. NON verificato `npm run build` in ambiente locale: registry npm non raggiungibile (EAI_AGAIN). Non e una release stabile.


---
## README_V14_2_FIX11_GIRONI_RIPESCAGGIO.md

# AK47DX Clan Manager V14.2 FIX11 — Gironi personalizzati e ripescaggio

## Novità
- Numero gironi selezionabile (massimo un girone ogni due squadre, fino a 16), distribuzione casuale equilibrata.
- Qualificate per girone configurabili; minimo un'eliminata per girone per consentire ripescaggio.
- Scegli tra fase iniziale a eliminazione diretta e fase a gironi seguita da playoff.
- Gironi cancellabili senza eliminare le iscrizioni/squadre; rigenerazione dei sorteggi e degli orari.
- Protezione risultati: la rigenerazione è bloccata quando ci sono risultati; la cancellazione con risultati richiede digitazione esatta di ELIMINA GIRONI.
- I gironi non possono essere rigenerati dopo che sono stati creati ripescaggi o playoff.
- Seconda possibilità selezionabile: uno o due percorsi di ripescaggio ad eliminazione diretta, ciascuno assegna un posto nel playoff principale.
- Tabelloni completi e passaggi automatici (bye). Gironi affiancati, classifica colorata verde / ambra / grigio.
- Le impostazioni sono salvate in `codm_tournaments.rules` JSON (no nuova migrazione SQL).

## Installazione (FIX10 già installata)
1. Conservare backup dei dati e della cartella sorgente.
2. Estrarre PATCH nella cartella principale del repository preservando le directory.
3. Sostituire `app/tournament/page.tsx` e `app/globals.css`.
4. Da PowerShell:
   cd "C:\\PERCORSO\\CLAN_MANAGER_AK47DX"
   npm ci --legacy-peer-deps
   npm run build
   git add -A
   git commit -m "AK47DX V14.2 FIX11 gironi e ripescaggi"
   git push origin main
5. Eseguire il push **solo se** il build finisce senza errori; Vercel pubblicherà il nuovo commit.
6. Nessuno script SQL nuovo per FIX11; rimangono necessari gli SQL delle versioni già installate (incluso score_limit).

## Prova funzionale
1. In Tornei > Tabellone, con torneo di test e 11 squadre, scegliere Gironi + playoff e 3 gironi.
2. Impostare 2 qualificate per girone, selezionare Seconda possibilità SÌ, 2 posti.
3. Generare gironi: devono esserci 3 gironi separati, ciascuna squadra presente in un solo girone e risultati vuoti.
4. Premere Rigenera gironi **prima** di salvare risultati: assegnazioni casuali e calendario aggiornati, stessa lista di squadre.
5. Salvare almeno un risultato: Rigenera non deve cancellarlo; Cancella gironi chiede ELIMINA GIRONI.
6. Completare tutti i risultati dei gironi, generare ripescaggio, completare le finali; generare playoff con qualificate e ripescate.
7. Verificare qualificazione verde, ripescaggio ambra e non qualificate grigie. Controllare BYE e avanzamento dei vincitori.
8. Controllare visualizzazione su smartphone e registrazione/persistenza della configurazione dopo ricarica pagina.
9. Prima di usarlo con tornei reali, testare policy Supabase, permessi e flusso playoff su un torneo separato.

## Limiti e note
- Eliminazione gironi dopo generazione ripescaggi/playoff volutamente bloccata per integrità dei risultati.
- Per ripescaggio servono almeno 2 squadre inizialmente non qualificate. Se sono poche, viene creato al massimo un percorso.
- Il round robin è una singola andata per coppia. Non è implementato il doppio girone.
- Il sorteggio viene casualizzato usando Math.random; non è un sorteggio verificabile crittograficamente.
- Non si tratta ancora di una release Official Stable: compilazione completa e collegamento Supabase da verificare sul tuo ambiente.


---
## README_V14_2_FIX12_RIPESCAGGIO_OPZIONALE.md

# AK47DX V14.2 TEST — FIX12: RIPESCAGGIO OPZIONALE A GIRONI O ELIMINAZIONE DIRETTA

## Base di partenza
La patch e' stata creata sopra la V14.2 TEST FIX11 (GIRONI_RIPESCAGGIO). Non sostituire l'intero sito quando basta la patch.

## Nuove funzioni
- Seleziona formato fase iniziale: Solo eliminazione diretta oppure Gironi + playoff.
- Per il torneo con gironi, scegli il ripescaggio: **Da decidere dopo i gironi**, **Nessun ripescaggio**, **Tutte le non qualificate -> nuovi gironi** oppure **Tutte le non qualificate -> eliminazione diretta**.
- Il ripescaggio coinvolge tutte le squadre non qualificate dei gironi principali, senza duplicati.
- Scegli 1 o 2 posti ripescaggio per raggiungere i playoff; ogni percorso assegna un posto.
- La fase a gironi di ripescaggio mostra classifiche separate e risultati, e qualifica la prima di ciascun girone al termine di tutti gli incontri.
- La fase a eliminazione diretta mostra gli incontri del ripescaggio in un tabellone e qualifica le vincitrici delle finali; gestisce i BYE.
- Nessun ripescaggio: entrano nei playoff soltanto le squadre qualificate direttamente; gli slot liberi sono BYE, non ripescaggi impliciti.
- Formato scelto salvato nel JSON `codm_tournaments.rules`: `second_chance`, `second_chance_pending`, `second_chance_format`, `second_chance_slots`.
- Nessuna cancellazione o migrazione dei tornei gia' conclusi. Se playoff o ripescaggio sono stati generati, la scelta viene bloccata per evitare modifiche ai risultati.

## Installazione FIX12 (sopra FIX11)
1. Conserva copia del progetto e fai backup Supabase.
2. Estrai lo ZIP patch nella cartella principale del progetto Git, preservando la struttura delle directory.
3. Sostituisci `app/tournament/page.tsx`; aggiungi `src/lib/tournamentRepechage.ts`.
4. Esegui:

```powershell
cd "C:\PERCORSO\CLAN_MANAGER_AK47DX"
npm ci --legacy-peer-deps
npm run build
```

5. Solo se la build e' riuscita:

```powershell
git add -A
git commit -m "AK47DX V14.2 FIX12 ripescaggio gironi o eliminazione"
git push origin main
```

FIX12 non richiede SQL aggiuntivo rispetto alla V14.2 FIX10/FIX11. I permessi Supabase esistenti devono consentire la scrittura nel torneo.

## Collaudo suggerito
1. Crea un torneo DI PROVA con 11 squadre (senza toccare tornei reali gia' avviati).
2. Seleziona Gironi + playoff, 3 gironi, 2 qualificate per girone, Ripescaggio DA DECIDERE; genera gironi e registra i risultati.
3. Verifica che non sia possibile generare i playoff finche' il ripescaggio e' da decidere.
4. Seleziona Ripescaggio a gironi con 2 posti: le 5 escluse formeranno gruppi da 3 e 2, con 4 partite totali. Completa la classifica: le prime di ciascun gruppo passano ai playoff.
5. Ripeti in un NUOVO torneo di prova con ripescaggio a eliminazione diretta e 2 posti: tutte le 5 escluse entrano nei due percorsi con BYE ove necessario; le vincenti delle finali passano ai playoff.
6. Verifica orari, modalita', mappe, nomi giocatori e colorazione dei qualificati.
7. Prova Nessun ripescaggio su un ALTRO torneo: le escluse non devono rientrare; eventuali slot vuoti saranno BYE.
8. Controlla il comportamento da smartphone e i risultati su Supabase.

## Verifiche eseguite per la patch
- Parse TypeScript/TSX: nessun errore sintattico nella pagina e nell'helper.
- Test automatici degli abbinamenti per 2-25 squadre, gruppi da 1/2 percorsi: passati.
- Test di generazione ripescaggio con 11 squadre e 5 escluse, per entrambe le modalita' e 1/2 posti: passati.
- Resta NON VERIFICATA la build Next.js completa, poiche' `node_modules` nel workspace non contiene i pacchetti necessari; va eseguito `npm run build` localmente o su Vercel.
- Non e' stato possibile collaudare il salvataggio sul database Supabase reale.

Non applicare script di DROP/RESET e non ricaricare dati storici durante l'installazione.


---
## README_V14_2_FIX15_STATISTICHE_STAGIONI_CLAN.md

# AK47DX Clan Manager — V14.2 FIX15 (TEST)

## Scopo
Aggiornare `/analytics` per visualizzare il totale di tutte le stagioni, comprese quelle storiche, e uno storico dettagliato degli scontri contro ciascun clan avversario, senza confondere le Scrim (serie) con le singole partite.

## Modifiche
1. **Filtro predefinito: Tutte le stagioni.** Somma stagioni attive, archiviate, storiche e risultati senza stagione riconosciuta. Il filtro su una stagione mostra unicamente quella.
2. **Tabella riepilogativa stagioni** con partite singole (G/V/P/N/WR), serie Scrim (G/V/P/N/WR), numero di registrazioni con solo risultato; click sul nome per filtrare.
3. **Storico per clan avversario** con conteggio Scrim, vittorie, sconfitte, pareggi, WR Scrim, numero di partite singole e loro bilancio, più storico espandibile (data, stagione, modalità, risultato, punteggio, disponibilità statistiche).
4. **Nomi avversari normalizzati** per differenze tra maiuscole e spazi: `RES`, `res`, `  RES  ` diventano lo stesso avversario nella visualizzazione, senza modificare i dati già registrati.
5. **Paginazione** delle tabelle partite, statistiche e scoreboard oltre 1.000 risultati (fino a 50.000 per tabella; oltre mostra un errore esplicito per evitare totali incompleti).
6. **Statistiche individuali** combinate tra scoreboard e `match_player_stats` legacy, evitando di conteggiare lo stesso giocatore nella stessa partita due volte quando l'identità coincide.
7. **Export Excel** con nuovi fogli `STAGIONI`, `CLAN_AVVERSARI`, `RISULTATI_SCRIM`, oltre agli esistenti; riepilogo W/L/WR separato tra serie e partite.
8. **Filtro clan avversario** applicato coerentemente ai risultati e alle statistiche delle partite corrispondenti.

## Regola fondamentale: NON sommare serie e partite
Una Scrim con punteggio finale 3-2 e `match_scope='series'` è **una Scrim** (1 incontro vinto), non 5 partite singole inventate. La percentuale vittorie Scrim è separata da quella delle partite singole. Se inserisci anche le 5 partite complete, esse compaiono nelle statistiche partite e non moltiplicano il numero delle Scrim.

I risultati con `record_quality='result_only'` incidono solo sui conteggi a livello di squadra e non generano dati giocatore K/D/A, tempo obiettivo o MVP inesistenti.

## Installazione patch (sopra V14.2 FIX12 o più recente se gli stessi file non sono stati modificati)
1. Esegui un backup Supabase prima del deploy.
2. Estrai lo ZIP FIX15 nella root del progetto Git, mantenendo `app/` e `src/` e sostituendo i file omonimi.
3. Da PowerShell:

```powershell
cd "C:\PERCORSO\CLAN_MANAGER_AK47DX"
npm ci --legacy-peer-deps
npm run build
```

4. **Solo se la build riesce**:

```powershell
git add -A
git commit -m "AK47DX V14.2 FIX15 statistiche stagioni e clan"
git push origin main
```

5. Vercel esegue il deploy. Apri **Statistiche** e controlla le due nuove tabelle.

**SQL:** non servono nuove migrazioni per FIX15. Per i risultati storici sono comunque necessarie le migrazioni V14.2 precedenti già applicate. FIX15 non cambia schema o record esistenti.

## Collaudo consigliato
- Seleziona Tutte le stagioni: somma S1 + S2 + stagioni storiche, più eventuali risultati non assegnati.
- Seleziona S1: visualizza solo S1, poi S2: solo S2, poi una stagione storica: solo quella.
- Importa due Scrim contro lo stesso clan con risultati 3-2 e 1-2: nello storico devono risultare 2 Scrim, 1 vinta e 1 persa, WR 50%.
- Verifica che maiuscole diverse nel nome del clan producano un'unica riga.
- Apri dettagli clan: data, stagione, punteggio e risultato devono corrispondere alle righe originali.
- Controlla che la vittoria di una serie 3-2 non aumenti di 5 le partite singole.
- Con una stagione filtrata, esporta Excel filtrato e verifica i fogli `STAGIONI`, `CLAN_AVVERSARI`, `RISULTATI_SCRIM`.
- Prova >1000 partite se presenti, per verificare la paginazione.

## Verifiche in preparazione
- Test automatici del modulo di riepilogo: **5/5 superati**.
- Verifica sintattica TS/TSX: **superata**.
- Build Next.js completa (`npm run build`): **non eseguibile in preparazione** per pacchetto npm `zlibjs` non disponibile nella cache offline. Va verificata prima del push su PC o Vercel.
- Nessun test su database Supabase live; versione **TEST**, non Official Stable.


---
## README_V14_2_FIX16_SCRIM_24H_DASHBOARD.md

# AK47DX Clan Manager — V14.2 TEST FIX16
## Riepilogo Scrim storiche + nuove e nuova Dashboard Statistiche

### Regola dei conteggi
- Ogni risultato `record_quality=result_only` importato in passato e ogni `match_scope=series` vale una Scrim completa.
- Ogni partita nella stagione storica (`is_historical=true`) vale una Scrim autonoma. Per compatibilita' con l'archivio originario, anche la stagione non attiva denominata `Stagione 1` viene interpretata come storica.
- Le nuove singole partite complete si raggruppano in una Scrim se: stesso `clan_id`, stesso `season_id`, stesso clan avversario (confronto senza differenze di maiuscole e spazi) e timestamp entro **24 ore dalla prima partita** del gruppo. La finestra NON si estende a catena.
- Le Scrim possono contenere Postazione, CED, Dominio, Controllo, mappe diverse. Il filtro di modalita'/mappa non spezza una Scrim nella vista panoramica.
- Se non si conoscono data o avversario, non si uniscono automaticamente partite diverse.
- Una Scrim con partite note e' VINTA se vittorie > sconfitte, PERSA se sconfitte > vittorie, altrimenti PAREGGIATA. Es. 2V+1P = Scrim Vinta 2-1; 1V+1P = Pareggio Scrim.
- Una Scrim storica con risultato 3-2 e' una Scrim, **non cinque righe fittizie**. Se successivamente esistono cinque partite reali con risultato corrispondente, nella medesima finestra e stagione, vengono mostrate come dettaglio della stessa Scrim.
- `Tutte le stagioni` somma tutte, anche storiche e partite senza stagione. Una singola stagione restituisce solo la sua porzione.
- Il totale delle Scrim = Scrim storiche + Scrim raggruppate nuove. I numeri di partite e le statistiche individuali restano distinti.

### Interfaccia
- In testa: Scrim totali, Scrim vinte, WR Scrim, partite con dati.
- Grafico degli esiti e grafico per stagione (cliccabile).
- Tabelle semplici per stagione e per clan; storico completo dentro un pannello espandibile.
- Risultati dei singoli incontri sotto ogni clan, con date, punteggi e modalita'/mappe delle partite.
- Filtri avanzati e grafici giocatori compressi in pannelli espandibili; i Tempi obiettivo rimangono visibili nella sezione dedicata.
- Fogli Excel `RIEPILOGO`, `STAGIONI`, `CLAN_AVVERSARI`, `RISULTATI_SCRIM` aggiornati con la stessa logica del sito.

### Installazione (patch sopra V14.2 FIX15)
1. Eseguire un backup dati (consigliato prima di ogni deploy).
2. Estrarre la PATCH FIX16 nella **radice** del progetto Git, sovrascrivendo i 3 file `app/analytics/page.tsx`, `app/globals.css` e aggiungendo `src/lib/scrimAggregation.ts`; preservare gli altri file.
3. `cd "C:\\PERCORSO\\CLAN_MANAGER_AK47DX"`
4. `npm ci --legacy-peer-deps`
5. `npm run build`
6. **Solo se** la build riesce: `git add -A`, `git commit -m "AK47DX V14.2 FIX16 scrim storico 24h dashboard"`, `git push origin main`.
7. Attendere il completamento del deployment Vercel e verificare la pagina Statistiche da PC e telefono.

**Non servono nuove migrazioni SQL**. FIX16 non modifica alcun dato nel database: i raggruppamenti sono calcolati in lettura. Se l'ambiente Vercel rifiuta il deploy, consultare il log del primo errore `Type error`, non i warning `deprecated`.

### Test
`node --experimental-strip-types --test tests/fix16_scrim_24h.test.mjs` (Node 22+)

Esempi da confrontare:
- 3 Scrim storiche contro RES nello stesso giorno = 3 Scrim.
- 3 nuove partite contro RES (2V, 1P) in 5 ore = 1 Scrim Vinta 2-1.
- 2 partite contro clan diverso = Scrim distinta.
- Una nuova partita 25 ore dopo la prima contro RES = seconda Scrim.
- Se `S1=10 Scrim` e `S2=5 Scrim`, `Tutte=15`, salvo incontri senza stagione che si sommano separatamente.
- I risultati di una Scrim storica non aggiungono Kill, Death, Assist, MVP o tempo obiettivo inesistenti.

### Stato tecnico
- Test unitari sul raggruppamento: 7/7 superati.
- Controlli sintattici sui TS/TSX modificati superati.
- La build completa `npm run build` non e' stata verificabile nel container: cache npm incompleta e problemi del client npm in download. NON considerare FIX16 una Official Stable prima di build e prove Supabase/Vercel.


---
## README_V14_2_FIX17_BRACKET_64_MAPPE_ARMI.md

# AK47DX Clan Manager — V14.2 FIX17 TEST · Tabelloni fino a 64 + Mappe/Armi

## Nuova funzione

Dentro **Tornei → Tabelloni 64** c'è un generatore indipendente dai tabelloni precedenti, configurabile con:
- Da 5 a 64 **squadre qualificate**; 8/16/32/64 slot, formato minimo automatico oppure superiore scelto manualmente.
- Teste di serie (ordine manuale nominativo o sorteggio casuale).
- BYE automatici assegnati alle teste di serie alte; il BYE **non genera una partita** e non conta per le statistiche.
- Doppia eliminazione MODIFICATA: Winners W, Losers L, Grand Final BO3. Il perdente della Finale Winners viene eliminato; NON è previsto bracket reset né una seconda Grand Final.
- La formula delle SERIE effettive è W=N−1, L=N−3, Grand Final=1, totale=2N−3; per N=64: 63+61+1=125.
- I collegamenti vincente/perdente fra incontri sono conservati nel motore e mostrati come destinazioni nel tabellone e nel prospetto; il disegno dei connettori fra card è ancora semplificato.
- Catalogo: 75 mappe multiplayer CODM, 9 categorie di armi per 145 modelli. Gli elenchi sono modificabili dall'Admin, poiché il gioco viene aggiornato.
- Per OGNI modalità si selezionano le mappe effettivamente compatibili, poi categoria/armi permesse. Nessuna selezione implicita: la modalità/mappe/armi vengono controllate prima del sorteggio.
- Estrazione casuale o modifica manuale per incontro di modalità/mappa/arma, limite punteggio; calendario interno con data/ora.
- Grand Final BO3: tre mappe DIVERSE e un'arma configurabile per ciascuna delle tre partite; risultato 2–0, 2–1, 0–2 oppure 1–2.
- Schema e risultati del nuovo formato salvati nel campo JSONB `codm_tournaments.rules.advanced_bracket_v2`, già esistente nel progetto. **Non servono nuove migrazioni SQL.**

## Compatibilità e limiti di FIX17 TEST

- I tornei storici e le partite salvate in `codm_tournament_matches` NON sono modificati. Il nuovo generatore funziona in un nuovo torneo, oppure dopo gironi esistenti già completati senza playoff creati.
- Se un torneo ha già playoff del sistema precedente, crea un nuovo torneo per il formato 64.
- FIX17 mantiene lo storico delle partite del sistema precedente. I risultati inseriti in `Tabelloni 64` sono salvati nel campo JSON del torneo e visibili nel suo **calendario e tabellone interno**; l'integrazione degli stessi risultati con le tabelle legacy di statistiche globali e gli eventi Telegram rimane **da completare**, per evitare doppi conteggi.
- Il motore conserva i riferimenti fra vincitori e perdenti; i collegamenti grafici sono indicati tramite frecce/ID di destinazione, ma non c'è ancora un tracciato SVG completo che disegni una linea precisa fra ogni coppia di card.
- Il catalogo mappe CODM (fonte comunitaria aggiornata al periodo 2026) non garantisce che ogni mappa sia attiva in ogni playlist. Lo staff sceglie le combinazioni per modalità e può aggiungere mappe/armi non presenti.
- Lo stato e i risultati vengono aggiornati nel JSON del torneo. Non utilizzare due Admin contemporaneamente per modificare la stessa scheda; la pagina fa una verifica preventiva della revisione, ma non garantisce transazioni concorrenti atomiche sul JSON.
- FIX17 è TEST, non una Official Stable: non è stato possibile scaricare le dipendenze npm e lanciare una build completa Next.js in questo ambiente. Non pubblicare in produzione senza `npm run build` e test su un progetto Supabase di prova.

## Installazione PATCH sopra FIX16

1. Esegui backup del database PostgreSQL e Storage, conservando uno ZIP/sorgente funzionante del sito.
2. Estrai la PATCH FIX17 nella cartella principale del repository, mantenendo i percorsi. **Non eseguire script SQL di reset.**
3. Verifica la compilazione e il motore:

```powershell
cd "C:\PERCORSO\CLAN_MANAGER_AK47DX"
npm ci --legacy-peer-deps
npm run test:bracket64
npm run build
```

4. Solo se test e compilazione riescono:

```powershell
git add -A
git commit -m "AK47DX V14.2 FIX17 tabelloni 64 mappe e armi"
git push origin main
```

5. Controlla il deploy Vercel: se fallisce, usa il **primo** errore TypeScript o runtime, non i warning `deprecated`.

## Prova guidata sul sito

1. **Tornei → Crea/Gestisci:** crea un torneo TEST separato, aggiungi 11 o 23 squadre in **Squadre** o **Iscrizioni**.
2. Apri **Tabelloni 64**. Per 11 squadre il formato automatico è **Ottavi, 16 posti, 5 BYE**; prova manualmente anche un formato 32 posti.
3. Seleziona 3 o più mappe per la modalità preferita (es. CED), poi in **Categorie e armi** abilita una categoria/alcune armi.
4. Genera l'anteprima e controlla i conteggi: 10 Winners + 8 Losers + 1 Grand Final = **19** serie con 11 squadre.
5. Prima di salvare puoi scegliere **Modifica formato / Rigenera anteprima** senza toccare il database. Poi premi **Salva tabellone e configurazione**. Clicca una partita con due squadre già definite e inserisci il risultato; controlla l'avanzamento del vincitore nel W e del perdente nel L.
6. Completa i turni fino alla Finale Winners e alla Finale Losers; verifica che la sconfitta in Finale Winners comporti eliminazione.
7. Nella Grand Final verifica le tre mappe diverse, il risultato BO3 e il campione.
8. Dal tab **Calendario del nuovo tabellone** controlla giorno, ora, nickname, mappa, modalità, arma e risultato.
9. Non usare in contemporanea il vecchio pulsante Genera playoff su questo stesso torneo: una protezione ora lo blocca se esiste `advanced_bracket_v2`.

## Test locali effettuati

- Motore TypeScript isolato: `tsc --strict` superato.
- Componente nuovo: verifica TypeScript isolata con shim React superata.
- 104 simulazioni strutturali, N da 5 a 64, modalità auto e manuali; tutte terminano in una GF valida, senza incontri fittizi, conteggi W/L corretti.
- Esempi 11, 23, 37 e 53 inclusi nei test.
- Build completa Next.js NON verificata: npm registry non raggiungibile (`EAI_AGAIN`).

## Sorgenti catalogo
- https://www.callofduty.com/mobile
- https://callofduty.fandom.com/wiki/Call_of_Duty:_Mobile

**Non rinominare la build Official Stable fino a deploy e collaudo completi.**


---
## README_V14_2_FIX18_MAPPE_ARMI_STAGIONI_RIGENERA.md

# AK47DX Clan Manager V14.2 TEST FIX18 — Mappe, torneo armi, totale stagioni, rigenerazione

## Perché sul sito mancavano le modifiche
- Nei log condivisi dall'utente, l'ultimo push `main` confermato era FIX15 (`192e4bd`): FIX16/FIX17 nei file ZIP non diventano automaticamente un deployment Vercel.
- La pagina principale `/tournament`, tab «Regole / Armi», utilizzava un elenco statico di **27 mappe**, diverso dalle 75 del catalogo FIX17 in «Tabelloni 64».
- La pagina `/version` mostrava ancora un marker V13.11.2.
- FIX16 aveva già il calcolo delle Scrim globali ma non era stato possibile verificare che fosse online.

## Modifiche FIX18
1. `/tournament`: **75 mappe** dal catalogo unico `src/lib/codmTournamentCatalog.ts`, comprese Saloon, King, **Gulag Showers (Gulag)**, Stack, Killhouse, Cage. Ricerca, seleziona tutto e deseleziona tutto. Le mappe sono nel catalogo, non automaticamente ammesse a ogni modalità. Per i bracket 64 lo staff conferma i pool per singola modalità.
2. `/tournament` → `Mappe / Torneo armi`: 9 categorie con armi specifiche selezionabili, seleziona/deseleziona categoria; salva nel vecchio campo JSON `rules.allowed_weapons`. Durante la generazione di nuove partite legacy viene sorteggiata un'arma fra quelle selezionate, registrandola nelle note dell'incontro; nelle partite del bracket 64 resta disponibile anche il selettore dedicato per ogni match e Grand Final.
3. `/tournament` → `Crea / Gestisci`: **Rigenera torneo da iscritti**. Richiede digitazione `RIGENERA`, duplica il torneo in una nuova edizione, copia gli iscritti e, facoltativamente, le squadre. Riparte senza match né risultati; l'edizione originale non viene cancellata. Non duplica i dati individuali di produzione. Se la copia fallisce dopo la creazione della nuova edizione, la nuova edizione può restare parziale: controllare prima di riprovare.
4. `/analytics`: **Somma TUTTE LE STAGIONI** in una riga esplicita: Scrim, vinte, perse, pareggiate, WR, vecchie, nuove, partite. Pulsanti di reset filtri e ricarica dati Supabase, e contatore risultati caricati. Da FIX16: ogni vecchio risultato e' una Scrim; le nuove partite per clan+stagione entro 24h formano una Scrim; non duplicare serie storiche dettagliate. Le statistiche individuali sono derivate soltanto da partite che le contengono.
5. `/version`: marker `AK47DX_V14_2_FIX18_MAPPE_ARMI_STATISTICHE_RIGENERA`, da usare come controllo del deployment effettivo.

## Installazione patch sulla FIX17 (o build completa senza altre modifiche locali)
1. **Fai backup** del repository e controlla l'ultima versione funzionante; non copiare la patch sopra una V13 o una V14 non aggiornata.
2. Estrai lo ZIP patch dalla radice del progetto Git, preservando `app`, `src`, `tests`. Per la build completa estrai in una cartella pulita, poi usa il tuo repository Git corretto.
3. Prompt dei comandi Windows:

```cmd
cd C:\Users\spea4060_tmv331ef\Documents\PROGETTI\COD\CODM_CLAN_INTELLIGENCE_2_0_DEPLOYABLE_PWA_YOLO_AK47DX
npm ci --legacy-peer-deps
npm run test:bracket64
npm run test:fix18
npm run build
```

4. **Solo se il build e i test riescono:**

```cmd
git add -A
git commit -m "AK47DX V14.2 FIX18 catalogo mappe armi statistiche rigenerazione"
git push origin main
```

5. Su Vercel controlla che il progetto segua `main` (ambiente Production) e che il deployment punti al nuovo commit. Se i trigger automatici non funzionano, crea un deployment manuale del commit appena pubblicato. `git push` da solo non garantisce che Vercel abbia effettivamente distribuito la build.
6. Apri **`https://TUO-DOMINIO/version`**: deve riportare esattamente `AK47DX_V14_2_FIX18_MAPPE_ARMI_STATISTICHE_RIGENERA`. Se leggi ancora V13, FIX15/16 o non compare il marker, non stai vedendo la nuova build. Verifica deployment e service worker PWA in `/cache-reset`, poi ricarica.
7. Test a mano con il tuo Supabase: in Tornei > Mappe / Torneo armi cerca Saloon, King, Gulag, Stack, Killhouse, Cage; seleziona armi, salva, genera un torneo **di prova**. In Tornei > Gestisci > Rigenera verifica nuova edizione, vecchi risultati intatti. In Statistiche > Tutte le stagioni verifica che la riga Σ coincida con la somma per stagione e che sia presente la stagione storica.

## Note di compatibilità
- Nessuna nuova migrazione SQL FIX18.
- Il motore bracket FIX17 continua a produrre N-1 serie Winners + N-3 Losers + 1 Grand Final BO3, escludendo BYE. FIX18 non ha cambiato quel motore.
- Non esportare la FIX18 come Official Stable finché test di Next.js, deploy Vercel e Supabase reali non sono stati verificati sul proprio ambiente.
- Una Scrim storica è un risultato di serie, non cinque partite individuali inventate.

## Test eseguiti in ambiente di preparazione
- Script FIX17: 104 configurazioni, esito OK.
- Test FIX16 Scrim 24h: 7/7 OK.
- Test FIX15 riepilogo stagioni: 5/5 OK.
- Nuovo controllo FIX18: catalogo mappe, categorie armi, collegamento UI, duplicazione iscritti e totale stagioni: OK.
- Parse/traspilazione degli 81 file TS/TSX: nessun errore sintattico.
- **Build Next.js completa NON certificata** in ambiente di preparazione (dipendenze npm non installate qui). Eseguire `npm run build` sul PC con `node_modules` presente prima del push.


---
## README_V14_2_FIX19_TORNEO_UNICO_SCRIM.md

# AK47DX V14.2 FIX19 TEST — Torneo unificato, impostazioni persistenti e Scrim corrette

## Modifiche
- Tabellone 8–64 Winners/Losers e Grand Final integrato nella scheda `Tabellone`, senza tab dedicato. Il pulsante classico è disponibile solo per i gironi.
- Il doppio tabellone prende le regole mappe/armi dalla scheda `Mappe / Torneo armi`. Le impostazioni avanzate possono essere salvate anche PRIMA di generare il bracket.
- Aggiornamenti verificati con `select(...).single()` per evitare falsi successi se i permessi Supabase bloccano la scrittura.
- Gli errori Supabase vengono mostrati con codice, messaggio, dettaglio e suggerimento, non `[object Object]`.
- Il numero di posti del ripescaggio PRELIMINARE dei gironi non è più fisso a 1–2; le opzioni disponibili sono adeguate al numero di squadre. Non è mai un limite ai Losers: il tabellone W/L riceve tutte le eliminate nei turni previsti.
- Se in una stagione storica esistono cinque partite dettagliate contro lo stesso clan in 24 ore, conta UNA Scrim. I risultati storici importati `result_only` o `series` contano ciascuno come una Scrim.
- Non elimina risultati esistenti o modifica la struttura SQL.

## Installazione
Patch sopra la V14.2 FIX18 (NON su versioni anteriori); in alternativa usare ZIP completo FIX19. Non copiare la cartella `.git` da ZIP.

```cmd
npm ci --legacy-peer-deps
npm run test:bracket64
npm run test:fix18
npm run test:fix19
npm run build
```

Solo se tutti i comandi riescono:
```cmd
git add -A
git commit -m "AK47DX V14.2 FIX19 torneo unico salvataggio statistiche"
git push origin main
```

Verifiche funzionali: salvare mappe e armi, riaprire torneo e controllare persistenza; generare Winners/Losers dal solo Tabellone; filtrare stagione storica e verificare che 5 partite dettagliate risultino 1 Scrim; controllare /version e Vercel per ultimo commit.

**Importante**: `npm run build` completo e test Supabase sul proprio account sono obbligatori prima del rilascio stabile. Se esce ancora un codice SQL, fotografarlo o copiarlo.

## Come usare la FIX19 senza tab separato
1. **Tornei → Mappe / Torneo armi**: seleziona mappe, modalità, singole armi; premi **Salva mappe, armi e regolamento su Supabase**. Deve comparire il messaggio di conferma.
2. **Tornei → Tabellone**: se scegli eliminazione diretta, vedi subito Winners/Losers. Se scegli gironi, prima genera/gioca i gironi e l’eventuale ripescaggio preliminare, quindi il tabellone finale compare nella stessa pagina.
3. Nel pannello integrato, seleziona formato automatico/manuale, teste di serie, mappe per modalità e armi. Premi **Salva scelte mappe / armi / formato** PRIMA di generare, se vuoi conservare la configurazione.
4. Premi **Genera anteprima Winners + Losers + BO3**; controlla BYE e avversari e poi **Salva tabellone e configurazione**. Il risultato è salvato nel campo JSON `codm_tournaments.rules` già presente.
5. **Statistiche → Tutte le stagioni**: cinque partite dettagliate entro 24 ore con stesso clan e stagione valgono una Scrim; cinque vecchie righe importate come risultati completi di Scrim valgono cinque Scrim.
6. Visita `/version`: deve riportare `AK47DX_V14_2_FIX19_TORNEO_UNICO_SCRIM`. Dopo un deploy Vercel, se il browser mostra ancora FIX18 usa `/cache-reset`.

Il vecchio bottone dei playoff a eliminazione diretta è stato rimosso dal flusso per i nuovi tornei; non vengono cancellati incontri storici. La lista di posti qualificati dopo eventuali **gironi di ripescaggio** ora si adatta al numero di squadre: NON limita il tabellone Losers/Winners.

**Limiti**: il test automatizzato del motore e il controllo sintattico non equivalgono a una build Next.js completa; inoltre le policy RLS di Supabase e i vincoli sul database dell'utente non possono essere verificati senza connessione alla sua istanza. Se si verifica un errore di salvataggio, ora è visualizzato codice + dettagli per diagnosticarlo con precisione.


---
## README_V14_2_FIX21_GRAFICA_TABELLONE_CALENDARIO.md

# AK47DX V14.2 FIX21 — Grafica tabellone/calendario + assegnazioni torneo

## Obiettivo
Patch mirata per rendere il flusso Tornei più chiaro e più presentabile senza cambiare lo storico esistente.

## Modifiche incluse
1. **Assegnazione armi casuale valorizzata in UI**
   - Le partite generate continuano a usare solo le armi abilitate.
   - L'arma sorteggiata viene mostrata in modo più visibile nelle card del calendario e negli incontri dei gironi/ripescaggi quando presente nelle note della partita.

2. **Calendario più pulito e ordinato**
   - Squadra A e Squadra B in blocchi separati e ben allineati.
   - Badge centrale `VS` ben evidenziato.
   - Riga meta con modalità, mappa, arma, limite e lobby.
   - Risultato/stato in fondo, più leggibile.

3. **Card incontri gironi e ripescaggi migliorate**
   - Testate con fase/turno e data.
   - Blocchi squadra con punteggio separato.
   - Meta-info più chiara per mappa/arma/lobby.

4. **Tabellone Winners/Losers più presentabile**
   - Ogni match mostra intestazione, VS centrale, squadre più ordinate, chip per modalità/mappa/arma e percorso vincente/perdente.
   - Titolo più chiaro: tabellone completo del torneo, non tab separato “buttato lì”.

5. **Messaggistica più coerente**
   - Evidenziato che prima si genera il percorso completo del torneo e poi si possono ancora modificare orari, mappe, armi e risultati.

## File modificati
- `app/tournament/page.tsx`
- `app/tournament/AdvancedBracketCenter.tsx`
- `app/globals.css`

## Importante
Questa patch **non sostituisce** la correzione database FIX20. 
Se sul tuo Supabase manca `score_limit`, devi eseguire anche il file SQL già fornito:
- `AK47DX_V14_2_FIX20_SUPABASE_TORNEI_SCORE_LIMIT.sql`

## Build locale essenziale
Usa **Node 22 / 23 / 24** (non Node 26). Poi esegui:

```bash
cd cartella progetto
npm ci --legacy-peer-deps
npm run build
git add -A
git commit -m "V14.2 FIX21 grafica calendario tabellone"
git push origin main
```

## Nota
Le statistiche Scrim/Partite possono richiedere un passaggio separato di verifica dati se alcuni match sono stati importati senza `match_scope` o senza aggregazione coerente di serie.


---
## README_V14_2_FIX22_TOURNAMENT_PRO.md

# AK47DX V14.2 — FIX22 TEST · Tournament Center Professional

**Base:** V14.2 FIX21. Questa build non cancella tornei, iscritti, risultati o storico.

## Funzioni implementate
- Calendario e gironi: squadra in grassetto centrata, nomi giocatori in piccolo sotto, due colonne allineate e VS centrale.
- Tabellone completo graficato con **collegamenti SVG e frecce effettive** tra incontri: blu = passaggio del vincente, arancione tratteggiato = discesa nel Losers, oro = fase Grand Final. Scorrimento/zoom browser per grandi tabelloni.
- Tabellone unificato Winners/Losers/GF senza sezione extra; tutte le fasi già pianificate.
- Prima della fine dei gironi si possono generare e salvare i posti «1° Girone A», «2° Girone B» e «Ripescata n» nel bracket.
- Al termine dei gironi gli slot mostrano le squadre reali senza cambiare l'identificativo o il routing del bracket salvato.
- Il pulsante risultato resta bloccato finché le squadre degli slot qualificazione non sono ufficiali.
- Mappa e arma sorteggiate dalle liste consentite, modificabili manualmente. La Grand Final BO3 conserva la scelta di tre mappe distinte e tre armi.
- Il Calendario mostra anche gli incontri del tabellone avanzato, non soltanto gli incontri classici dei gironi.
- Resta la rigenerazione per nuova edizione da iscritti, per non eliminare i dati storici.

## Limiti e attenzioni
- Il motore FIX17 accetta da **5 a 64 qualificati** per l'avvio del bracket. Se le impostazioni dei gironi producono meno di 5 qualificati, occorre modificare gironi/posti prima di generare.
- Quando i risultati dei gironi sono in corso, non si devono rigenerare gli slot o modificarne il significato. Le impostazioni si bloccano quando il tabellone avanzato viene salvato.
- **Il tabellone si salva in `codm_tournaments.rules.advanced_bracket_v2`**; non vengono create partite duplicate in `codm_tournament_matches`.
- L'orario delle future partite del bracket si definisce nel pannello dell'incontro; non è assegnato automaticamente se non configurato.
- L'anteprima delle qualificazioni è una progettazione degli incroci, non un esito già acquisito.
- La generazione del tabellone avanzato richiede che in *Mappe / Armi* siano stati selezionati e salvati almeno una modalità, mappe valide e almeno un'arma. La Grand Final BO3 richiede 3 mappe distinte.
- Su Supabase deve già essere applicata la FIX20 per la colonna `score_limit` delle partite classiche, se non ancora presente.

## Installazione: applica la PATCH sopra FIX21
1. Fai una copia di sicurezza della cartella progetto (compresa `.git` e `.env.local`).
2. Estrai i file della PATCH FIX22 direttamente nella cartella di progetto, mantenendo le sottocartelle `app`, `src`, `tests`, `public`.
3. **Non eseguire npm ci** se la build FIX21 compilava e le dipendenze non sono cambiate. Questa release non aggiunge nuove dipendenze.
4. Apri Prompt dei comandi nella cartella del progetto ed esegui:

```cmd
npm run test:bracket64
npm run test:fix18
npm run test:fix19
npm run test:fix22
npm run build
```

5. Pubblica **solo dopo il successo dei test e della build**:

```cmd
git add -A
git commit -m "AK47DX V14.2 FIX22 tabellone frecce qualificazioni"
git push origin main
```

6. Verifica Vercel Production e visita `/version` (marker `AK47DX_V14_2_FIX22_BRACKET_CONNETTORI_PRO`). Se vedi la versione vecchia, apri `/cache-reset`.

## Verifiche funzionali consigliate dopo il deploy
1. Nuovo torneo di prova, 16 squadre, 4 gironi, 2 qualificate per girone.
2. In Tabellone: scegli `Gironi + playoff`, numero gironi e qualificate, ripescaggio sì/no. Prima di giocare genera il bracket con gli slot `1° Girone A`, ecc.
3. Controlla collegamenti frecce Winners → Winners e Winners → Losers e il nodo Grand Final BO3.
4. Salva, ricarica la pagina e verifica che il piano persista su Supabase.
5. Completa un girone; verifica che lo slot assegnato mostri la squadra effettiva con i giocatori sotto.
6. Controlla che il Calendario includa sia i gironi sia gli incontri futuri del bracket, con mappe e armi.
7. Verifica la vista mobile/PWA e lo scroll bidirezionale.

## Stato build
I test di motore e di mapping + parsing TSX sono stati eseguiti qui. La compilazione integrale `next build` deve ancora essere confermata sul tuo PC: l'installazione delle dipendenze in questo ambiente non è terminata correttamente. Si tratta di una **build TEST**, non certificata STABLE.


---
## README_V14_2_FIX23_TABELLONE_COMPATTO.md

# AK47DX V14.2 FIX23 TEST — Tabellone panoramico compatto

## Modifiche
- Da FIX22, senza cambiare codici o dati già persistiti su Supabase.
- Un unico tabellone: Winners in alto, Losers in basso e Grand Final all'estrema destra.
- Frecce reali SVG basate sui collegamenti del motore. Vincente blu, perdente arancione, ingresso Grand Final oro.
- Incontri abbreviati come W1, W2, L1, L2, GF in tabellone, calendario, routing e tabella delle qualificazioni. Gli ID tecnici originali restano invariati nel database.
- Card più piccole, con squadra in grassetto, giocatori sotto piccoli e regolari, VS perfettamente centrato, mappa/arma/ora e punteggi centrati.
- Due viste integrate: **Panoramica completa**, adattata alla larghezza/altezza, e **Dettaglio leggibile** da scorrere. Con 32–64 squadre i testi nella panoramica possono diventare piccoli: usa Dettaglio per leggere e modificare ogni incontro. Non è tecnicamente possibile mostrare 125 incontri tutti leggibili contemporaneamente su un telefono.
- Classifiche gironi compattate senza scroll orizzontale, con troncamento dei nomi molto lunghi se necessario.
- Calendario e pagina risultati uniformati, senza modificare i valori storici.
- `/version` aggiornata al marker `AK47DX_V14_2_FIX23_COMPACT_UNIFIED_BRACKET`.

## Sicurezza dei dati
Non elimina incontri, risultati, iscritti, squadre e tornei. Non sono necessarie nuove query SQL per queste modifiche grafiche. Il fix SQL della colonna score_limit (FIX20) resta necessario se non ancora applicato.

## Applicazione PATCH sulla FIX22
1. Chiudi l'app locale e fai una copia di sicurezza della cartella.
2. Estrai i file della PATCH direttamente nella directory principale del progetto, **sovrascrivendo** i file con gli stessi percorsi (es. `app/tournament/BracketFlowBoard.tsx`).
3. Conserva `.git` ed `.env.local`. Non eliminare `node_modules`.
4. Dalla cartella del progetto esegui:

```cmd
npm run test:bracket64
npm run test:fix18
npm run test:fix19
npm run test:fix22
npm run test:fix23
npm run build
```

Se i controlli completano correttamente:

```cmd
git add -A
git commit -m "AK47DX V14.2 FIX23 tabellone compatto unificato"
git push origin main
```

Verifica il deployment Production su Vercel e `/version`. Se la PWA mostra vecchi file, apri `/cache-reset`.

## Test eseguiti qui
- `test:bracket64`: 104 casi superati.
- `test:fix18`: superato.
- `test:fix19`: superato.
- `test:fix22`: superato.
- `test:fix23`: simulazione layout 8, 16, 24, 32 e 64 squadre, codici brevi e centrature, superata.
- Compilazione Next.js completa in questo ambiente: **non certificata** perché l'installazione `npm ci` nell'ambiente di generazione è rimasta bloccata. Esegui `npm run build` sul computer dove le dipendenze sono già installate; non lanciare npm ci inutilmente.


---
## README_V14_2_FIX24_ISCRIZIONI_EXPORT.md

# AK47DX V14.2 FIX24 TEST — Iscrizione pubblica e Export Center

Baseline: FIX23 (tutti i componenti precedenti conservati). 14 ottobre 2026.

## Novità

- Pagina **`/iscrizione/<UUID del torneo>`** pubblica, adatta al cellulare e senza login.
- Campi obbligatori: Cognome, Nome, Nome in gioco CODM, UID numerico, accettazione dell'informativa privacy via link esterno HTTPS.
- Stato iscrizioni, limite partecipanti *individuali* facoltativo, conferma e riferimento domanda.
- Tournament Center → Iscrizioni: copia link WhatsApp, cerca/filtra, approva/rifiuta/annulla, modifica dati e cancella registrazioni prima che siano usate in partite/squadre.
- Approvazione: la richiesta pubblica crea un record nello storico iscrizioni del torneo già utilizzato per generare squadre; UID e dati anagrafici restano in una tabella privata separata.
- Tournament Center → Esportazioni: Excel 10 fogli (iscritti, squadre, gironi, classifiche, calendari, risultati, qualificazioni, Winners, Losers/Grand Final), CSV iscritti, PDF pubblico per calendario/classifiche, PDF A3 con schema e frecce del tabellone avanzato.
- Controlli: DB con RLS, funzioni RPC con privilege separation, UID univoco per torneo, consenso richiesto; honeypot base. **Non** è incluso un CAPTCHA o rate-limiter distribuito: per pubblicazioni su larga scala integrare una difesa anti-bot adeguata.

## Installazione patch, senza reinstallare dipendenze

1. Esegui **backup** del progetto e possibilmente del database Supabase prima di applicare modifiche.
2. Estrai lo ZIP **PATCH FIX24** direttamente nella cartella principale del progetto, sovrascrivendo le cartelle `app`, `src`, `tests`, `public`, `supabase` e `package.json`. NON aggiungere una cartella intermedia.
3. In Supabase → **SQL Editor**, esegui integralmente `supabase/UPDATE_V14_2_FIX24_PUBLIC_SIGNUPS.sql`. Lo script non cancella partite, tornei o iscritti esistenti. Non eseguire il RESET schema.
4. Dal terminale nella cartella progetto: `npm run test:fix24`, `npm run test:fix23`, `npm run test:bracket64`, `npm run build`. NON usare `npm ci` se le dipendenze sono già installate.
5. Se la build passa: `git add -A`, `git commit -m "AK47DX V14.2 FIX24 iscrizioni pubbliche export"`, `git push origin main`.
6. Verifica **`/version`** (FIX24), lo stato Production su Vercel e usa `/cache-reset` se la PWA mostra ancora FIX23.
7. Apri **Tornei → Crea/Gestisci**, scegli un torneo, imposta `Iscrizioni aperte`, URL HTTPS della **vera** informativa privacy del responsabile del trattamento e limite iscritti individuali facoltativo, quindi **Salva**.
8. Vai su **Tornei → Iscrizioni**, usa **Copia link**, aprilo in navigazione anonima e prova l'iscrizione. Lo staff connesso può approvarla; verifica l'arrivo automatico fra gli iscritti e la selezione nella creazione squadre.
9. Vai su **Tornei → Esportazioni** e prova XLSX/CSV/PDF.

## Test e sicurezza

- Sono stati eseguiti test locali JS sul motore FIX17–FIX23 e test statici del nuovo flusso FIX24.
- **Non** è stata completata una Next.js production build in questo ambiente per blocco dell'installazione delle dipendenze; rilascio **TEST**, compilare e verificare lato Vercel prima della pubblicazione ufficiale.
- I dati personali non sono leggibili tramite la funzione pubblica di consultazione torneo: espone solo nome, formato, disponibilità, privacy URL e numero richieste attive.
- Il personale deve testare in Supabase che utenti non staff NON possano fare SELECT della tabella `codm_tournament_public_signups`.
- Il limite individuale tiene conto delle richieste pubbliche attive, non dei giocatori già inseriti manualmente o dei team preesistenti.
- Il PDF pubblico esporta solo informazioni sportive; Excel/CSV includono dati personali e vanno trattati come documenti riservati, senza condividere pubblicamente.
- Correzione/cancellazione anagrafica bloccata quando il nickname è già collegato a squadre/partite, per non alterare risultati storici. Le richieste privacy in tale condizione vanno gestite dallo staff con una procedura specifica di conservazione/correzione dei dati.
- L'informativa deve essere predisposta e pubblicata dal responsabile del trattamento; l'app NON genera una privacy policy legale.
- **Non** inserire mai una chiave Supabase service_role nel frontend o in NEXT_PUBLIC_*.

## Pacchetti

- PATCH: file modificati e nuovi, destinata a una FIX23 funzionante.
- COMPLETE BUILD TEST: sorgenti completi (senza `node_modules`, `.env` e segreti). La cartella progetto estratta è pronta per installazione sul tuo PC.


---
## README_V14_2_TEST_IMPORT_STORICO_TORNEI.md

# CODM AK47DX V14.2 TEST — risultati storici e Tournament Center

## NOVITÀ
- `Importa risultati storici`: XLSX/CSV, foglio `RISULTATI_STORICI`, anteprima tabella e schede modificabili, gruppi di 100 record fino a 1000, controllo elenco clan dello stesso clan AK47DX senza duplicare il nome per differenze maiuscole/minuscole; suggerimenti per clan già incontrati. La deduplica risultati usa `ID_RISULTATO`/nome file+riga; **incontri diversi contro lo stesso clan sono consentiti**. I file reimportati sono rifiutati se hanno la stessa chiave.
- Per risultati finali Scrim usare `LIVELLO=SERIE`, non `SINGOLA`. La modalità non nota va impostata `ALTRO` senza inventare la mappa.
- Scegli una stagione STORICA già creata da Admin; **la stagione attiva non viene toccata**. Esito derivato automaticamente dal punteggio. Le serie sono contate come incontri, non come partite individuali; KDA/MVP non inventati.
- Tornei: regolamento con modalità attive, mappe sorteggiabili, limiti punteggio per modalità, numero di lobby (1–4), slot di calendario (10–180 min). Configurazione registrata nei `rules` del torneo. Sorteggio casuale delle mappe/modalità SOLO tra quelle consentite; gli incontri generati vengono salvati, NON rigenerati sopra incontri esistenti.
- Calendario torneo: giorno, ora, lobby, nomi giocatori accanto a nomi squadre e risultati.
- Gironi più compatti (G/V/N/Diff/Pt); tabellone e calendari mostrano giocatori delle squadre tra parentesi; prospetti qualificati/eliminati sotto il tabellone e avanzamento turno successivo.

## PRIMA DEL DEPLOY
1. Backup recente Supabase e sorgente Git.
2. Aprire **Supabase → SQL Editor** sul database AK47DX e applicare `supabase/UPDATE_V14_2_TOURNAMENT_SCORE_LIMIT_NON_DESTRUCTIVE.sql`. NON eseguire lo script di reset, NON eseguire `FINAL_SCHEMA`.
3. Controllare il risultato del `SELECT` per `score_limit`. Questo SQL preserva le righe esistenti e amplia il vincolo modalità per consentire ALTRO/CONTROL.
4. Sostituire i file del progetto con quelli del ZIP (senza cancellare `.env.local` e senza copiare vecchi node_modules).
5. Sul PC Windows: `cd "C:\PERCORSO\CLAN_MANAGER_AK47DX"` poi `npm ci --legacy-peer-deps` e `npm run build`. Se il build termina correttamente: `git add -A`, `git commit -m "AK47DX V14.2 TEST import storico e tornei"`, `git push origin main`.
6. Vercel esegue il deploy da main: verificare lo stato verde del build.

## ESEMPIO DI IMPORT
Il sito offre il template `public/templates/AK47DX_V14_2_RISULTATI_STORICI.xlsx` con foglio VUOTO `RISULTATI_STORICI`, guida e esempi in foglio distinto **NON DA IMPORTARE**.
Formato riga: `ID_RISULTATO`, `DATA` (AAAA-MM-GG), `STAGIONE` (nome storico già creato), `CLAN_AVVERSARIO`, `MODALITA` (CED/POSTAZIONE/DOMINIO/CONTROLLO/ALTRO), `MAPPA` facoltativa, `PUNTEGGIO_AK47DX`, `PUNTEGGIO_AVVERSARIO`, `LIVELLO` (SERIE/SINGOLA), `GIOCATORI`, `NOTE`, `FOTO_URL`.

## VERIFICHE
- Importare una scrim 2–1 in stagione storica e ripetere contro lo stesso clan con data diversa: devono risultare DUE incontri, UN solo nome clan normalizzato.
- Reimportare lo STESSO file: il server deve impedire duplicati con chiavi già inserite. Se fallisce un batch, le righe non salvate rimangono nella pagina; non ripetere quelle già confermate.
- Verificare che le statistiche storiche mostrino il Win Rate degli incontri e NON inventino K/D/A.
- Nel torneo creare squadre 2v2 con nomi e membri, aprire Regole, scegliere 1–2 modalità e 2–3 mappe, impostare limite, salvare torneo, generare gironi (solo se nessun incontro esistente), verificare calendario, nomi, limite e tabellone.
- Inserire punteggi dei gironi; verificare classifica G/V/N/Diff/Pt, colorazione qualificate/eliminate, prospetto avanzamenti e playoff.
- Su smartphone controllare tabella gironi compatta e scorrimento orizzontale tabellone.

## LIMITI VERIFICATI / NON VERIFICATI
Sono stati controllati sintassi TypeScript/TSX, struttura file e archivio ZIP. **Non è stato possibile fare il build Next.js completo** nel container (npm registry EAI_AGAIN) e NON è stato testato su Supabase di produzione. Versione TEST, non Stable.
Le impostazioni nuove richiedono la migrazione SQL per `score_limit`, e sono applicate agli incontri che si generano DOPO l'aggiornamento. Le vecchie partite possono avere `score_limit = NULL`.


---
## README_V14_BUILD.md

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


---
## README_V14_TEST_BUILD.md

# AK47DX V14.1 TEST — Release di prova (NON Official Stable)

## Hotfix 14.1 TEST FIX2 — Vercel TypeScript (09/10/2026)

- Corretto `app/import/match/page.tsx`: la mappa `Record<GameMode, string>` comprende ora le nuove modalità `CONTROLLO` e `ALTRO`. Risolve il blocco TypeScript `./app/import/match/page.tsx:375:9` segnalato dal deploy b2b2518.
- Allineato `src/lib/statistics.ts` per mostrare etichette coerenti nelle statistiche.
- Include anche FIX1 in `app/admin/seasons/page.tsx` (RPC Supabase chiamate come funzioni `async`).
- **Nessuna modifica SQL o ai dati** rispetto alla V14.1 TEST.
- La compilazione completa `npm run build` non è stata verificabile nell'ambiente di generazione: eseguire prima del push sulla macchina locale o verificare log Vercel.

## Hotfix 14.1 TEST FIX1 — Vercel TypeScript

- Corretto `app/admin/seasons/page.tsx`: le chiamate Supabase RPC usate nei pulsanti **Attiva** e **Archivia / Rendi attivabile** vengono ora racchiuse in funzioni `async`, che restituiscono una vera `Promise` come richiesto dall'helper `run()`.
- Risolve il primo errore TypeScript segnalato da Vercel al percorso `./app/admin/seasons/page.tsx:17:615`: `PostgrestFilterBuilder ... is missing ... from type Promise`.
- Nessuna migrazione SQL aggiuntiva rispetto alla V14.1 TEST originale.
- **Verifica:** il blocco non è stato riprodotto con una build completa in questo ambiente perché `npm ci` non riesce a raggiungere npm (`EAI_AGAIN`). Eseguire `npm run build` localmente o attendere il risultato del deploy Vercel.


**Partenza:** sorgente V14 Preview basata su V13.11.2.
**Hosting invariato:** Vercel + Supabase + GitHub. Nessun reset o migrazione verso VPS.

## Implementato in questa build

1. **Stagioni:** nuova pagina `/admin/seasons` (Owner): crea stagione storica con nome/date/descrizione, trasforma una stagione storica in ordinaria e attiva una nuova stagione senza riassegnare il vecchio archivio. Solo una stagione attiva; la stagione storica non diventa attiva automaticamente. Operazioni protette anche nel database con RPC che autorizzano esclusivamente l'Owner principale.
2. **Import storico** `/import/history`: risultati senza K/D/A, modalità CED/Postazione/Dominio/Controllo/Altro, clan già incontrati suggeriti oppure nome nuovo, punteggi ed esito calcolato, stagione NON attiva, date, mappa/nomi/nota e collegamento foto HTTPS facoltativi. Excel `.xlsx/.csv` con anteprima modificabile; fino a 100 record per salvataggio; controllo ID Excel ripetuti; backend `/api/history-results` verifica sessione e ruolo Staff/Coach/Owner.
3. **Statistiche e archivio:** etichetta «Solo risultato» vs «Completi»; distinzione incontro/serie vs partita singola, KPI delle scrim/serie separati dal Win Rate delle singole partite; esportazione Excel con indicazione livello e completezza. Risultati singoli storici includibili nei numeri del clan, senza creare finti dati player.
4. **Import completo:** importazione TEMPO_OBIETTIVO mm:ss da Excel (più intestazioni alternative, secondi espliciti e valori orario Excel), colonna editabile su PC e mobile, persistenza su `match_player_stats` e `match_scoreboard_rows`; tempo non disponibile = NULL, mai 00:00 fittizio. Correzioni su un record storico singolo salvano sullo stesso match_id, aggiornando completezza.
5. **Tournament Center:** iscrizione Staff da elenco incollato/roster, giocatori esterni non registrati, modifica nome squadra e titolari, controllo duplicazioni nominativi tra squadre, gironi visibili insieme in card separate, risultati e colori definitivi solo a girone concluso, generazione round robin con 11 coppie in 3 gironi 4+4+3, playoff dalle qualificate, tabellone scorrevole, lobby e arbitro e avviso conflitti.
6. **Restyling:** variabili colore AK47DX Modern Tactical, contrasto menu e tabelle, card gironi, colori playoff, focus tastiera, accesso alle pagine nuove dal menu PWA laterale. Menu basso preesistente preservato su una sola riga.
7. **Backup:** il download `.json.gz` precedente è preservato. Inserito **controllo di formato non distruttivo** di un archivio caricato da Admin Backup: mostra riepilogo senza scrivere in DB.

## IMPORTANTISSIMO: funzioni NON ancora collaudate/completate

- Questo ZIP **non è** la Official Stable. L'installazione Next.js non è riuscita nell'ambiente di generazione (dipendenze di rete non accessibili); `npm run build` non è stato completato qui. È stata verificata la sintassi TypeScript/TSX, non la compilazione end-to-end.
- Il **ripristino integrale da sito** resta deliberatamente disabilitato (rischio perdita utenti/Auth/Storage). La funzione di ispezione ZIP/GZ non è un restore.
- Il download backup dal sito **non comprende i file fisici Supabase Storage né auth.users**. Salvare ancora il backup pgAdmin e gli allegati separatamente.
- L'OCR per tempi obiettivo funziona solo se il parser/backend restituisce il valore. In caso contrario correggere a mano dall'anteprima; l'Excel contiene supporto mm:ss.
- Restano da collaudare sul progetto reale: avanzamento playoff dopo modifiche risultati già confermati, orari e notifiche Telegram, UX mobile e tutte le parti Events già presenti in V13.
- La sicurezza RLS delle tabelle legacy è ereditata dal database esistente e richiede una verifica specifica prima di una release pubblica.

## INSTALLAZIONE DI PROVA (raccomandata su clone/staging di Supabase)

1. Conservare una copia del progetto attuale e del `.backup` pgAdmin verificato. Copiare gli screenshot da Supabase Storage separatamente.
2. Su **un progetto Supabase di test con schema esistente** verificare che `supabase/UPDATE_V14_SEASONS_OBJECTIVE_NON_DESTRUCTIVE.sql` sia stato già eseguito (dall'installazione V14 Preview attuale). NON rieseguirlo acriticamente: potrebbe reimpostare la Stagione 2 come attiva e assegnare stagioni ai record senza season_id.
3. Eseguire **solo** `supabase/UPDATE_V14_1_HISTORY_SEASONS_NON_DESTRUCTIVE.sql` in **Supabase → SQL Editor** del database di test. Lo script usa ALTER ADD COLUMN IF NOT EXISTS e aggiunge funzioni RPC. Non elimina né ricrea statistiche.
4. Verificare in Supabase che compaiano colonne `record_quality`, `match_scope`, `historical_source_key` in `matches`, `is_historical` in `codm_seasons`, `lobby_name` in `codm_tournament_matches`. Prima prova poi produzione.
5. Estrarre ZIP nella cartella repository Git esistente (non eliminare `.git`) e impostare `.env.local` basandosi su `.env.example`. Non committare `.env.local`.
6. Comandi PowerShell essenziali:

```powershell
cd "C:\PERCORSO\CLAN_MANAGER_AK47DX"
npm ci --legacy-peer-deps
npm run build
npm run dev
```

7. Provare in locale `/admin/seasons`, `/import/history`, `/analytics`, `/matches`, `/tournament`, `/admin/backup`. Solo dopo test riusciti e migrazione SQL sul progetto corretto, fare deploy su Vercel tramite Git.

```powershell
git add -A
git commit -m "AK47DX V14 TEST - Stagioni storiche, import risultati, tempo obiettivo e tornei"
git push origin main
```

8. Verificare log di Vercel e schema Supabase. Se `npm run build` fallisce, **non fare push**: inviare l'errore per una correzione. Evitare sul database reale i file `RESET*`, `LOAD*` o `FINAL_SCHEMA_CLAN_MANAGER.sql`.

## Checklist test applicativo

- [ ] S1/S2 esistenti restano invariate e Stagione 2 è ancora attiva.
- [ ] Crea “Stagione storica 2025”, resta storica, compare nel filtro statistiche.
- [ ] Importa CED 6-4 «Solo risultato» sulla stagione storica; nessun player inventato.
- [ ] Importa un secondo risultato contro lo stesso clan: record distinto.
- [ ] Carica Excel vecchi risultati due volte: la seconda volta viene bloccata per chiave ID duplicata.
- [ ] KPI «Partite» diverso da KPI «Serie/Scrim», Win Rate corretti.
- [ ] Importa una Postazione con `TEMPO_OBIETTIVO=01:45` e controlla 105 secondi nel database e 01:45 nella UI.
- [ ] Importa Dominio con tempo vuoto: deve rimanere NULL, non 00:00.
- [ ] Iscrivi due giocatori dal roster e un ospite esterno in un torneo.
- [ ] Rinomina squadra; salva, prova un nome duplicato e un player già usato.
- [ ] Genera 11 squadre in tre gironi, assegna lobby/orari, controlla classifica e qualificazioni.
- [ ] Completa i gironi, genera playoff, controlla le migliori terze e avanzamento.
- [ ] Verifica l'archivio backup .json.gz senza modificare il database.
- [ ] Testare PWA su iOS/Android e menu inferiore in una sola riga.

## Nota sul backup

Il database SQL completo e l'archivio Storage vanno salvati separatamente anche dopo aver provato questa build. Il ripristino reale deve essere testato prima su un database distinto, mai dal pulsante web in questa build.


## V14.2 FIX26 (2026-10-14)
Separazione per torneo, schede Gironi/Eliminazione, partecipanti 2v2 derivati dalle squadre, lettura pubblica tramite RPC anonime whitelist, aggiornamento Realtime/polling e grafica bracket compatta con frecce e zoom. SQL nuovo: UPDATE_V14_2_FIX26_TOURNAMENT_PUBLIC_READ.sql.
