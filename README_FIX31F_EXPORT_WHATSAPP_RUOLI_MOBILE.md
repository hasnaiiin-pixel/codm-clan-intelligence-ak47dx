# AK47DX Clan Manager V14.2 — FIX31F TEST (17/10/2026)

**Base:** `CODM_AK47DX_V14_2_TEST_FIX31E_RUBRICA_PRO_COMPLETE_SOURCE.zip` fornita dall'utente. Questa cartella contiene i **sorgenti completi**, non una applicazione compilata e non un backup dei dati Supabase. Nessun contatto reale, file `.env.local` o credenziale incorporata. Versione ancora **TEST** fino a compilazione e collaudo sul database reale.

## Modifiche FIX31F

1. **Esportazioni WhatsApp / Excel:** per il personale autorizzato, la versione condivisibile comprende nickname, ruolo principale, tutti gli incarichi aggiuntivi, UID e telefono già salvato. Non è più necessario attivare `share_phone` nella scheda di ogni giocatore. Numeri mancanti segnalati come mancanti. WhatsApp crea **un solo blocco di testo** con pulsante copia. Predefinito **solo Attivi**; togli la spunta per **Tutti**. Anche l'Excel condivisibile include il numero.
2. **Accesso realmente protetto da Supabase:** la nuova RPC `ak_rubrica_export` per il formato condivisibile esige `view_contacts`, **entrambi** `export_shared` e `view_phone`; la console dei permessi resta riservata all'Owner. Il permesso `export_shared` **non** rende pubblico il numero sul sito, ma consente all'operatore di copiarlo/esportarlo. Chi riceve successivamente il messaggio WhatsApp vedrà i numeri: condividere soltanto con i destinatari previsti. Non vengono cambiati i consensi dei profili visitatori, la mappa o altri sistemi.
3. **Incarichi secondari:** elenco checkbox in sezione `<details>` richiudibile, inizialmente chiusa; riporta sempre numero e badge dei ruoli scelti. La chiusura non perde le scelte. Il ruolo principale resta distinto dai ruoli extra.
4. **Bug SQL ruoli:** la procedura `ak_rubrica_set_secondary_roles` non usa più `pg_catalog.coalesce` (non esiste). Controllo `COALESCE(array_length(...),0)` valido, massimo 12 ruoli e salvataggio tramite RPC protetta.
5. **Rubrica responsive:** ricerca tutta larghezza, Nuovo contatto prioritario, Aggiorna compatto sui telefoni, contenitore **Strumenti amministrativi** richiudibile (default chiuso) con Gestione accessi e Archivio/Eliminazione. Questi comandi sono visibili solo a Owner con `manage_access`. Nessun testo spezzato a metà. Su desktop mantiene il layout largo.
6. **Compatibilità:** conservati archivio, rubriche, stati Attivi, organigramma, mappa, foto, import screenshot, tornei e statistiche. Nuovo marker `/version` e cache PWA FIX31F.

### Script SQL da applicare (obbligatorio)

Per un database su cui hai **già applicato FIX31E** (anche se hai eseguito l'hotfix precedente dei ruoli), esegui **soltanto**:

`supabase/UPDATE_V14_2_FIX31F_WHATSAPP_RUOLI_HOTFIX.sql`

Procedura: **Supabase → SQL Editor → New query → incolla TUTTO lo script → Run**. Eseguilo sul progetto corretto; prima effettua backup. È una migrazione **non distruttiva**: sostituisce due funzioni senza modificare le righe o rimuovere colonne. `share_phone` resta nel database per compatibilità ma NON viene più richiesto per esportare.

Se sei ancora su una versione **precedente a FIX31E**, applica prima le migrazioni precedenti in ordine. La migrazione FIX31E inclusa in questa ZIP è aggiornata anche per nuove installazioni. Non ripetere le migrazioni passate senza controllare la versione reale del database.

### Installazione / pubblicazione (Windows, cartella Git già configurata)

1. Salva una copia della cartella progetto attuale, del database e dei file personali esterni.
2. Estrai **il contenuto** di questa ZIP **nella radice** della tua cartella di progetto, sostituendo i file omonimi. Non cancellare o sovrascrivere `.git`, `.env.local` o `node_modules` che sono già sul PC.
3. Sul progetto Supabase corretto esegui lo script SQL FIX31F indicato sopra.
4. Apri un terminale **nella tua cartella progetto** e lancia i comandi essenziali:

```cmd
cd C:\PERCORSO\DELLA\TUA\CARTELLA\CODM
npm ci --legacy-peer-deps
npm run test:fix31f
npm run build
git add -A
git commit -m "AK47DX V14.2 FIX31F rubrica WhatsApp ruoli e mobile"
git push origin main
```

**Importante:** esegui Git commit/push **solo dopo** build riuscita. Se la tua cartella locale contiene export rubrica con numeri, `.env.local`, SQL di import dati personali o screenshot privati, NON includerli nel commit. Controlla `git status` prima di `git add -A`.

5. Attendi il nuovo deployment su Vercel; apri `/version` e verifica **FIX31F**, poi `/cache-reset` se la PWA mostra ancora FIX31E. Può essere necessario chiudere e riaprire la PWA.

### Permessi da concedere allo staff

Owner → Rubrica → Giocatori → Strumenti amministrativi → Gestione accessi. Per far comparire il pulsante di export WhatsApp con numero a uno specifico account già registrato, assegna **`view_contacts`, `view_phone`, `export_shared`**. La selezione `export_shared` nell'interfaccia di Gestione accessi abilita automaticamente `view_phone` nell'editor (puoi comunque ricontrollare prima di salvare). I ruoli CODM non concedono permessi software.

Per esportazioni complete Staff rimangono necessari `export_staff` e `view_private_details`; l'accesso al telefono in questo export dipende da `view_phone`.

### Collaudo manuale obbligatorio

- Rubrica su Android/PWA: nessuna parola spezzata tra Nuovo contatto, Aggiorna, Gestione accessi, Archivio. Chiudi/Riapri strumenti e verifica che i pannelli si nascondano.
- Profilo di un contatto di **prova**: seleziona due ruoli secondari, chiudi/riapri il pannello, salva. Riapri profilo dopo refresh: entrambi presenti. Verifica che l'errore `function pg_catalog.coalesce(integer, integer) does not exist` sia sparito.
- Esportazione per account staff dotato dei tre permessi: senza aprire/modificare le singole schede, verifica che **telefono + ruolo principale + incarichi extra + UID + nickname** siano inclusi anche per `share_phone=false`. Verifica copie in un **solo blocco**. Ripeti con Solo attivi e Tutti.
- Rimuovi `export_shared` a un utente di prova: non deve poter usare la RPC condivisibile. Rimuovi `view_phone`: RPC deve dare permesso negato. Controlla anche l'assenza di telefoni nella pagina Rubrica pubblica anonima.
- Verifica Rubrica Attivi con UID/telefono mancanti, Compleanni, Mappa, Archivio, Organigramma e import, poi Tornei e Statistiche come regressione.

### Test eseguiti nell'ambiente di preparazione

- **20/20 suite locali di test statici/di regressione superate**, comprese 18 verifiche specifiche FIX31F e il parser TSX dei componenti modificati.
- **Non** è stato possibile completare `npm ci` nell'ambiente di preparazione (`zlibjs` mancante dalla cache e npm non ha terminato l'installazione). Di conseguenza `npm run build` non è riuscito perché `next` non era installato. **Build Next.js e Supabase reale NON verificati**; non definire la versione come stabile prima del collaudo sul PC/server.
