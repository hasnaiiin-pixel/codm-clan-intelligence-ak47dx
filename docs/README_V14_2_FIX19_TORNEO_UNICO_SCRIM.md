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
