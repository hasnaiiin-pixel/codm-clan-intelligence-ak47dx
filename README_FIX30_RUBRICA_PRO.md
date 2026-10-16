# AK47DX V14.2 FIX30 — RUBRICA PRO (TEST)

Build cumulativa da FIX29 Rubrica; il motore tornei, le Scrim e lo storico non sono stati modificati.

## Funzioni
- Rubrica raggruppata per **Fondatore/Capo Clan**, **Co-Capo/Vice Capo**, **Staff**, **Direzione da verificare**, **Membri**, **Non in clan / altri**. I ruoli non verificati rimangono provvisori.
- Popup di creazione/modifica con **anteprima foto CODM** e **foto personale**, caricamento JPG/PNG/WEBP fino a 3 MB su **bucket Supabase privato** `ak-rubrica-private`. Prima salva i contatti nuovi, poi carica la foto e premi Salva.
- Sottomenu Rubrica: **Rubrica**, **Compleanni**, **Mappa**, **Esportazioni** e **Nomi da screenshot** (solo Admin).
- Compleanni basati esclusivamente sui compleanni effettivamente inseriti, senza inventare date. Mappa approssimativa per **città/Paese con consenso esplicito per singolo contatto**; le località non riconosciute restano da completare.
- **Excel Admin completo** + storico nickname, Excel condivisibile; **WhatsApp Admin completo** e WhatsApp condivisibile suddiviso in blocchi copiabili. I telefoni nella versione condivisibile sono inclusi **solo se esplicitamente autorizzati** dal contatto. Le esportazioni sono protette dai permessi esistenti.
- Screenshot 15 immagini: 88 nickname distinti trascritti manualmente, di cui 60 match di nome proposti, 11 collegamenti da controllare e 17 senza associazione sicura. Le trascrizioni non certificano i caratteri speciali CODM: puoi correggere il nome nel campo prima di confermarlo. I nomi originali entrano nello storico. Gli UID **non sono nelle immagini**, quindi non sono usati per il matching.
- Archivio **privato separato** con 90 avatar ritagliati dagli screenshot. In Rubrica → Nomi da screenshot → Importa foto CODM, seleziona le immagini estratte dall'archivio: vengono associate in massa solo alle corrispondenze sicure (nessuna foto personale pubblicata).

## Installazione, in sequenza
1. BACKUP della cartella del progetto e del database Supabase. Usa FIX29 Rubrica già installata.
2. Estrai il contenuto della **PATCH FIX30** nella radice dell'app (cartella con `package.json`), sovrascrivendo i sorgenti. Mantieni `.git`, `.env.local`, `node_modules`.
3. Supabase Dashboard → SQL Editor: esegui **`AK47DX_FIX30_MIGRAZIONE_RUBRICA_PRO.sql`**. Crea il bucket privato, nuove colonne, funzioni RBAC e struttura del controllo screenshot. Non fa DROP di contatti.
4. Poi esegui **`AK47DX_FIX30_IMPORT_NOMI_SCREENSHOT_DA_VERIFICARE.sql`**, che carica esclusivamente le proposte di abbinamento (senza telefonini/UID). Aggiorna il ruolo già **provvisorio** di AlphaWolf a Capo Clan e di Tanjiro/Manu a Vice Capo, in base ai ruoli visibili nello screenshot. Non assegna un Fondatore inesistente.
5. Se vuoi importare anche le immagini gioco, estrai `AK47DX_FIX30_AVATAR_CODM_DA_SCREENSHOT_PRIVATI.zip` **FUORI DA GITHUB**, vai in Rubrica → Nomi da screenshot e seleziona tutti i file `avatars/*.jpg`. Controlla il conteggio dei caricamenti.
6. Verifica: `npm run test:fix30`, `npm run test:rubrica`, `npm run test:fix29`, `npm run build`. Non usare npm ci se le dipendenze sono già installate.
7. SOLO se `npm run build` passa e hai provato accessi normali e Admin: `git add -A`, `git commit -m "AK47DX FIX30 Rubrica Pro"`, `git push origin main`.
8. Verifica `/version`, poi `/rubrica` dopo il deployment. L'SQL agisce sul database reale, non serve ripeterlo se già applicato.

## Collaudo obbligatorio della privacy
- Come **visitatore anonimo**, `/rubrica` non deve mostrare alcun dato.
- Come account senza accesso, deve rifiutare lettura e modifica.
- Come account con accesso ma senza `view_phone`, non deve vedere o esportare telefoni.
- Foto personali disponibili soltanto a chi ha `view_social`. Bucket non pubblico.
- Testa carica foto, storico nickname, Excel completo, Excel condivisibile e WhatsApp diviso in blocchi.

## Limitazioni dichiarate
- Il progetto completo è **sorgente TEST**; qui non è stato possibile lanciare la build Next.js reale perché l'ambiente di preparazione non contiene `node_modules`.
- La mappa visualizza solo le città note al catalogo interno: non prova la posizione reale dei giocatori. Nella rubrica precedente non erano disponibili città, quindi inizialmente la mappa può risultare vuota.
- Le fotografie ritagliate da screenshot devono essere controllate visivamente: non sono foto personali e non devono essere pubblicate senza permessi.
- Un nickname abbreviato o con simboli speciali nello screenshot deve essere confermato dall'Admin; non sostituisce automaticamente UID o anagrafica.
