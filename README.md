# AK47DX Clan Manager — V14.2 FIX26 TEST

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
