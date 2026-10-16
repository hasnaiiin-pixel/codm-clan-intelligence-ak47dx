# AK47DX Clan Manager — V14.2 FIX30 TEST

**Rubrica Pro:** gruppi per ruoli, foto private CODM/personale nel popup, compleanni, mappa autorizzata, Excel/WhatsApp completo e condivisibile, riconciliazione nickname screenshot.

Per la procedura completa vedi `README_FIX30_RUBRICA_PRO.md`. Non importare numeri personali o avatar nel repository Git.

# AK47DX Clan Manager — V14.2 FIX29 TEST

**Nuovo:** modifica mappe/armi senza eliminare i gironi; popup calendario e risultati per incontri dei gironi e tabellone Winners/Losers. Consultare `README_V14_2_FIX29_CALENDARIO_RISULTATI.md` per istruzioni, test e deploy.

# AK47DX Clan Manager — V14.2 FIX28 TEST


Web/PWA Call of Duty Mobile: iscrizioni, squadre, gironi, doppia eliminazione Winners/Losers, Grand Final BO3, calendario, risultati, privacy e export.

## FIX26 — Tornei isolati, vista pubblica, aggiornamento automatico

- `/tornei`: elenco **pubblico** dei tornei non in bozza, senza login.
- `/tornei/<UUID-torneo>`: riepilogo, squadre (solo nickname), gironi/classifiche, calendario, risultati e tabellone completo in **sola lettura**.
- Le due viste usano RPC Supabase pubbliche **a campi selezionati**: non espongono iscrizioni anagrafiche, cognomi, UID, email, note o richieste privacy.
- I dati amministrativi (iscrizioni, confermati, squadre, incontri, esportazioni) sono sempre caricati con `tournament_id` del torneo selezionato. Non vengono elencati automaticamente giocatori dello storico di altri tornei.
- Per 2v2/5v5 prima si formano squadre dagli iscritti confermati del **medesimo torneo**; le partite sono generate dalle squadre, non da individui non ancora assegnati.
- Gironi ed Eliminazione sono due schede distinte. Le card del tabellone sono compatte; linee e punte freccia Winners blu / Losers arancio / GF oro, zoom e adattamento.
- I nuovi tabelloni usano il numero effettivo di squadre o qualificate: 12 squadre = capacità 16, **4 BYE**, 21 match complessivi per la doppia eliminazione modificata. I tabelloni salvati prima della FIX26 **non vengono ricalcolati**.
- Aggiornamento: Supabase Realtime quando la publication lo consente; polling ogni 20 secondi su pagine torneo, refresh quando si torna nell'app; service worker incrementato alla FIX26.

## Altre pagine pubbliche (FIX24/25)
- `/iscrizione/<UUID-torneo>`: modulo di iscrizione senza login con Nome, Cognome, Nickname e UID.
- `/privacy?tournament=<UUID-torneo>`: informativa dati; richiede verifica del titolare effettivo.
- `/privacy/richiesta?tournament=<UUID-torneo>`: accesso, rettifica, cancellazione tramite codice privato, senza email.

## Documentazione essenziale
- `README_INSTALLAZIONE.md`: installazione, SQL, test, deploy Vercel, collaudo pubblico.
- `supabase/UPDATE_V14_2_FIX26_TOURNAMENT_PUBLIC_READ.sql`: **nuova migrazione FIX26** necessaria per le viste pubbliche; eseguire dopo FIX24/FIX25, senza reset.
- `docs/project_history/RELEASE_NOTES_LEGACY.md`: storico versioni consolidato.

## Test
`npm run test:fix26 && npm run test:fix25 && npm run build`

> FIX26 è **TEST**: controlli locali di sintassi e logica superati. Il comando Next.js `npm run build` e il collaudo SQL su Supabase reale vanno eseguiti nel tuo ambiente prima della pubblicazione. I servizi npm non erano raggiungibili dall'ambiente di preparazione.


## FIX27 — Generatore squadre e spettatori (TEST)
- **Tornei → Squadre**: suggerimenti nomi filtrabili (Animali, Auto/Motori, Divertenti CODM, Simpatici, o Misto), emoji opzionali; sei proposte per volta, selezione con un clic, nome sempre modificabile manualmente.
- **Squadre**: pulsante Elimina con conferma. La rimozione interessa solo il torneo selezionato, conserva le iscrizioni; una squadra presente in incontri o tabelloni NON può essere eliminata per proteggere risultati e storico.
- **/tornei** e **/tornei/[id]**: pagina spettatori più ordinata, contatori essenziali, stato in evidenza, tab per gironi/tabellone/calendario/risultati; nessun dato anagrafico pubblico.
- **Database**: nessuna migrazione aggiuntiva FIX27; la FIX26 deve essere già installata. In caso di permessi RLS insufficienti, la cancellazione mostra un errore anziché fingere il successo.
- **Verifica locale**: `npm run test:fix27` e `npm run build` (usare node_modules già presenti, senza `npm ci` per questa patch).
- **Pubblicazione**: `git add -A`, `git commit -m "AK47DX V14.2 FIX27 nomi squadre e spettatori"`, `git push origin main` solo a build riuscita.

## FIX28 — Tornei Live: armi, tabellone e leggibilità

- La pagina pubblica `/tornei/[id]` visualizza la **lista delle armi consentite** nel riepilogo e, nel calendario, l'arma assegnata a ogni incontro (quando presente).
- **Tabellone**: se esiste uno snapshot Winners/Losers v2, mostra il percorso grafico già generato; con i vecchi playoff mostra almeno gli incontri già salvati senza inventare i collegamenti. Panoramica segnala che il tabellone è disponibile.
- **Gironi**: due colonne su desktop (con quattro gironi: due sopra e due sotto), una colonna su telefono; sotto il nome squadra vengono mostrati i nickname dei giocatori, in piccolo.
- **Calendario e Risultati**: card della stessa altezza, VS e riquadri modalità/mappa/arma centrati, punteggi chiari.
- La RPC pubblica FIX26 viene aggiornata da `supabase/UPDATE_V14_2_FIX28_SPECTATOR_DETAILS.sql`, che restituisce solo armi consentite e il valore `Arma sorteggiata:` delle note. **Non espone le note originali**, UID, cognomi, nomi reali né iscrizioni.
- Non sono stati modificati motore torneo, dati storici, schema delle tabelle o dipendenze npm.
- Test: `npm run test:fix28`, `npm run test:fix27`, `npm run test:bracket64`, `npm run build`. La build Next richiede le dipendenze del PC, non disponibili nell'ambiente di preparazione.
