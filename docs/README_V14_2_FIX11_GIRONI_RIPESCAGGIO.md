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
