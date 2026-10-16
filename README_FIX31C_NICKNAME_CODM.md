# AK47DX V14.2 FIX31C TEST — Nomi CODM completi dagli screenshot

## Errore di FIX31B trovato nei sorgenti
1. La funzione di caricamento cercava `UPPER(nickname)=UPPER(suggested_nickname)`, quindi non associava `AKঐMIRZA` con `MIRZA`.
2. Il caricamento in blocco scriveva `source_name` (esempio `MIRZA`) anziché il nome completo visibile in CODM (`AKঐMIRZA`).
3. Lo hotfix precedente correggeva solo l'assenza della funzione `ak_rubrica_screenshot_queue()`.

## FIX31C
- Nuova funzione di confronto normalizzato: rimuove esclusivamente il prefisso iniziale AK/ѦҞ e i suoi simboli, poi ignora punti/caratteri grafici per trovare il nickname base.
- Accetta solo corrispondenza univoca, non abbina nomi vagamente simili e non usa UID assenti dagli screenshot.
- Salva separatamente la proposta `full_nickname`, conservando il tag visibile.
- Il pannello mostra nome dallo screenshot, **proposta completa** e nome attuale Rubrica; un Admin può correggere il testo prima di salvare.
- Il comando di conferma multipla salva `full_nickname`, non `source_name`.
- Lo storico nickname viene preservato; UID, telefoni, compleanni, note e status NON vengono toccati.
- Le proposte incerte rimangono in revisione.

### ATTENZIONE AL TAG CODM
Dalle immagini caricate il simbolo del clan somiglia a `AKঐ`, che viene presentato come **proposta**, non come trascrizione carattere-per-carattere verificata. Confronta in gioco e correggi singolarmente se le lettere decorative differiscono. Non confondere `AKঐ` con eventuali varianti `ѦҞঐ`. Non premere "conferma tutti" senza averlo controllato.

## Procedura di installazione
1. Esegui backup cartella progetto e database Supabase.
2. Estrai la PATCH dentro la **radice** del progetto FIX31B, sovrascrivendo i file omonimi; conserva .git, .env.local e node_modules.
3. Esegui in Supabase SQL Editor, sul progetto collegato a Vercel, lo script `supabase/UPDATE_V14_2_FIX31C_NICKNAME_CODM_COMPLETI.sql` tutto insieme.
4. Da prompt Windows nella root esegui `npm run test:fix31c`, `npm run test:fix31b`, `npm run test:fix30`, `npm run build`.
5. Se riusciti, `git add -A`, `git commit -m "AK47DX FIX31C nomi CODM con tag"`, `git push origin main`.
6. Dopo il deploy verifica `/version` = FIX31C.
7. Rubrica -> Nomi da screenshot -> **Ricalcola nomi e abbinamenti con tag AK**. Verifica le proposte, poi premi "Salva nomi CODM completi per gli abbinamenti diretti" o correggi singolarmente.
8. Aggiorna Rubrica per vedere i nuovi nickname. Nella situazione originale 59 abbinamenti sono univoci su 76 schede; il numero reale può differire.

## Test e limiti
Test statici + parsing TSX passati, ma NON test su Supabase live e NON eseguita la compilazione Next.js completa. La migrazione è installazione di funzioni: non aggiorna automaticamente alcun nickname prima dell'azione Admin. Non caricare la Rubrica privata su GitHub.
