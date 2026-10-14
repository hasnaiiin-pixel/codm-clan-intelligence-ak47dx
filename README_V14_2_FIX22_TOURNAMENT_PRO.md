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
