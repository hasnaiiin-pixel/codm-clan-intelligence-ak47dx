# AK47DX Clan Manager V14.2 — FIX31E TEST · Rubrica Pro

La FIX31E parte dalla FIX31D. **Non cancella i 74 contatti importati** e non modifica partite, roster, tornei o risultati. La Rubrica usa RPC Supabase protette; tutte le funzioni SQL devono essere presenti prima di pubblicare l'interfaccia aggiornata.

## Modifiche

1. **Attivi corretti:** il gruppo dipende solo da `clan_status = 'Attivo'` (spazi/case normalizzati). WhatsApp, ruoli e completezza scheda sono indipendenti. Badge rosso per nickname/UID/telefono mancanti, senza spostare il contatto.
2. **Più incarichi:** `clan_role` principale + `secondary_roles` multipli, visibili in scheda/organigramma. Questi ruoli CODM non danno privilegi nell'app.
3. **Esportazioni:** `ak_rubrica_export` verifica permessi lato database. Default solo attivi; opzione tutti. Formato WhatsApp unico testo copiabile. Condivisibile include nickname CODM, UID e telefono *solo quando* `share_phone=true`, `view_phone` e `export_shared` autorizzati. Staff include tutti i dati disponibili secondo `view_private_details`, `view_phone`, `view_social`, `view_notes` e `export_staff`. Excel con stesso filtro server.
4. **Eliminazione:** in scheda puoi archiviare. Nuovo pannello Archivio per ripristinare o eliminare definitivamente, solo Owner per eliminazione irreversibile e solo dopo archiviazione e rimozione foto private collegate. Non vengono toccate partite e statistiche; gli eventuali altri vincoli del database possono bloccare la cancellazione.
5. **Pannello accessi:** elenco email autorizzate, modifica, revoca. Per vedere la Rubrica privata serve un account Supabase registrato e un'autorizzazione. Preset Membro = solo nickname/UID/ruolo degli attivi; staff con permessi granulari.
6. **Visitatori:** pagina `/rubrica/pubblica` non richiede accesso ma è **OFF** di default. L'Owner sceglie nickname/UID/ruolo; per pubblicare un giocatore servono stato clan Attivo **e consenso individuale esplicito** `public_profile_opt_in`. Mai telefono/foto/dati privati per anon.

## Procedura corretta su PC Windows

1. Fai backup del progetto e, se possibile, del database Supabase.
2. Verifica che la base installata sia almeno **FIX31D**. Se hai la FIX31C o precedente, applica le migrazioni mancanti nell'ordine di versione.
3. Estrai il **contenuto** della PATCH FIX31E nella radice del repository AK47DX esistente, sovrascrivendo i file omonimi. Non sovrascrivere `.env.local`, `.git` o `node_modules`.
4. In Supabase Dashboard → progetto corretto → SQL Editor → New query, incolla ed esegui **tutto** `supabase/UPDATE_V14_2_FIX31E_RUBRICA_STATO_RUOLI_EXPORT_ACCESSI.sql` in **un'unica esecuzione**. Non separare le funzioni su query diverse. Attendi `Success` e ricarica lo schema PostgREST (lo SQL invia già NOTIFY).
5. Apri terminale nella cartella progetto e usa:

```cmd
cd C:\Users\spea4060_tmv331ef\Documents\PROGETTI\COD\CODM_CLAN_INTELLIGENCE_2_0_DEPLOYABLE_PWA_YOLO_AK47DX
npm run test:fix31e
npm run test:fix31d
npm run test:fix30
npm run build
git add -A
git commit -m "AK47DX FIX31E rubrica stati ruoli accessi export"
git push origin main
```

**Non è richiesto `npm ci`** se le dipendenze del progetto sono installate.

## Verifiche manuali OBBLIGATORIE dopo deploy

- Visita `/version` e verifica FIX31E.
- Rubrica: imposta un giocatore con ruolo “Ex membro” ma stato **Attivo**; salva e verifica che rimanga negli Attivi anche senza UID/telefono. Riapri dopo refresh e verifica persistenza.
- Metti almeno 2 incarichi secondari, salva, ricarica e verifica nel profilo e nell'organigramma.
- Esporta WhatsApp/Excel “solo attivi”, confronta le schede con `share_phone` attivo/disattivo; verifica che nessun telefono non autorizzato esca nel blocco condivisibile.
- In “Gestione accessi”: concedi al tuo **account di prova** solo `view_contacts`; conferma che non veda numeri, date, città, note, foto, export Staff e altri utenti; revoca e verifica l'errore 42501.
- In pagina `/rubrica/pubblica` da browser anonimo: impostazione OFF = nessun profilo. Con attivazione + consenso individuale, deve mostrare solo i campi scelti; disattivando torna vuota. Controlla la risposta RPC, non solo la grafica.
- Archivia un **contatto di prova senza legami**, ripristina; archivia ancora e verifica doppia conferma prima dell'eliminazione definitiva. Su profili con immagini/FK, il sistema deve bloccare l'eliminazione.
- Verifica che Compleanni, Mappa e Nomi da screenshot della FIX31D siano ancora funzionanti.

## Sicurezza

Le migrazioni non inseriscono telefoni, email o UID reali nel repository. Evitare di committare esportazioni Staff, file di import dati personali o immagini private. Gli SQL impongono accessi Owner/flag sull'RPC; le tabelle private mantengono RLS e privilegi di accesso revocati. **L'abilitazione pubblica non autorizza automaticamente i profili:** serve consenso a livello di giocatore.

## Stato TEST

Test statici e parser TypeScript locali sono stati eseguiti. Non è stato possibile eseguire un build Next.js completo o provare il database Supabase reale nell'ambiente di preparazione per l'assenza delle dipendenze npm (`zlibjs`, cache incompleta; repository npm non raggiungibile). Non pubblicare come “stable” senza `npm run build` e i controlli manuali sopra.
