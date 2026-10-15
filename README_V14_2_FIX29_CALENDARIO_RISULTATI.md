# AK47DX V14.2 FIX29 TEST — Calendario e risultati rapidi

Baseline: **FIX28**. Questa build non rigenera gironi, non cancella iscrizioni e non richiede nuovi SQL quando le migrazioni fino alla FIX28 sono applicate.

## Novità

1. **Tornei → Mappe / Armi**: pulsante indipendente **Salva SOLO mappe e armi (senza cancellare gironi)**. Aggiorna esclusivamente i campi `rules.allowed_maps`, `rules.allowed_weapons`, `rules.allowed_preset` del torneo selezionato. Le mappe e le armi già assegnate alle singole partite rimangono salvate. Le modifiche al catalogo NON risorteggiano automaticamente gli incontri: per cambiare una singola partita aprirla dal calendario.
2. **Tornei → Calendario**: clic su card di un incontro ordinario dei gironi / ripescaggi / vecchi playoff → popup di modifica rapida. Campi: data e ora match, apertura lobby, modalità, mappa, arma, limite punti, punteggi delle due squadre, MVP. Il pulsante salva aggiorna **solo la riga `codm_tournament_matches` selezionata**, con controllo `tournament_id`, e non tocca gli altri incontri.
3. **Tornei → Risultati**: stesso popup cliccando una card. L'editor esteso resta disponibile.
4. **Calendario avanzato Winners/Losers**: clic sulla card → popup con data/ora, modalità, mappa, arma, punteggi e BO3 della Grand Final. Aggiorna soltanto la partita nello snapshot `rules.advanced_bracket_v2` e incrementa la revisione; nessuna rigenerazione del bracket né reset dei risultati.
5. **Protezioni**: risultati non completi, limiti punti, divieto di pareggi per eliminazioni dirette, conflitti ora/lobby/squadra, turni successivi già giocati, qualificati non ancora determinati, revisione concorrente del bracket.

## Installazione della patch

Estrarre lo ZIP e copiare **il contenuto della sua radice** nella radice del progetto Windows, sostituendo i file (non creare una cartella `FIX29` annidata nel progetto). Conservare `.git`, `.env.local`, `node_modules` e backup.

```cmd
cd C:\Users\spea4060_tmv331ef\Documents\PROGETTI\COD\CODM_CLAN_INTELLIGENCE_2_0_DEPLOYABLE_PWA_YOLO_AK47DX
npm run test:fix29
npm run test:bracket64
npm run build
```

**Non usare `npm ci`** se le dipendenze esistono e `npm run build` funziona. Pubblicare con Git solo se i controlli vanno a buon fine:

```cmd
git add -A
git commit -m "AK47DX V14.2 FIX29 mappe armi calendario risultati popup"
git push origin main
```

Dopo la pubblicazione su Vercel verificare `/version` (FIX29), `/tournament` da staff e `/tornei` in sola lettura da visitatore.

## Collaudo manuale essenziale

1. Selezionare torneo 2v2 già dotato di gironi e risultati.
2. Cambiare selezione mappe/armi → **Salva SOLO mappe e armi** → ricaricare: gironi e punteggi devono rimanere invariati.
3. Nel Calendario cliccare un incontro non giocato → impostare data/ora, mappa/arma e salvare → card aggiornata.
4. Cliccare un incontro giocato → registrare/modificare un risultato valido → salvare → classifica aggiornata.
5. In un torneo v2 aprire popup dal calendario playoff → scegliere data e arma → verificare salvataggio e frecce invariati; inserire punteggio solo con squadre determinate.
6. Provare con un secondo torneo: i dati non devono incrociarsi.

## Stato

I test funzionali locali FIX18–FIX29 (incluso motore 104 casi) e controllo sintattico TSX sono stati superati. **Build Next.js completa e test reale su Supabase non verificati nell'ambiente di preparazione**: la versione è TEST finché non vengono eseguiti sul PC e sul sito pubblicato.
