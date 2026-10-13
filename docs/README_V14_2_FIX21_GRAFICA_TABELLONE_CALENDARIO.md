# AK47DX V14.2 FIX21 — Grafica tabellone/calendario + assegnazioni torneo

## Obiettivo
Patch mirata per rendere il flusso Tornei più chiaro e più presentabile senza cambiare lo storico esistente.

## Modifiche incluse
1. **Assegnazione armi casuale valorizzata in UI**
   - Le partite generate continuano a usare solo le armi abilitate.
   - L'arma sorteggiata viene mostrata in modo più visibile nelle card del calendario e negli incontri dei gironi/ripescaggi quando presente nelle note della partita.

2. **Calendario più pulito e ordinato**
   - Squadra A e Squadra B in blocchi separati e ben allineati.
   - Badge centrale `VS` ben evidenziato.
   - Riga meta con modalità, mappa, arma, limite e lobby.
   - Risultato/stato in fondo, più leggibile.

3. **Card incontri gironi e ripescaggi migliorate**
   - Testate con fase/turno e data.
   - Blocchi squadra con punteggio separato.
   - Meta-info più chiara per mappa/arma/lobby.

4. **Tabellone Winners/Losers più presentabile**
   - Ogni match mostra intestazione, VS centrale, squadre più ordinate, chip per modalità/mappa/arma e percorso vincente/perdente.
   - Titolo più chiaro: tabellone completo del torneo, non tab separato “buttato lì”.

5. **Messaggistica più coerente**
   - Evidenziato che prima si genera il percorso completo del torneo e poi si possono ancora modificare orari, mappe, armi e risultati.

## File modificati
- `app/tournament/page.tsx`
- `app/tournament/AdvancedBracketCenter.tsx`
- `app/globals.css`

## Importante
Questa patch **non sostituisce** la correzione database FIX20. 
Se sul tuo Supabase manca `score_limit`, devi eseguire anche il file SQL già fornito:
- `AK47DX_V14_2_FIX20_SUPABASE_TORNEI_SCORE_LIMIT.sql`

## Build locale essenziale
Usa **Node 22 / 23 / 24** (non Node 26). Poi esegui:

```bash
cd cartella progetto
npm ci --legacy-peer-deps
npm run build
git add -A
git commit -m "V14.2 FIX21 grafica calendario tabellone"
git push origin main
```

## Nota
Le statistiche Scrim/Partite possono richiedere un passaggio separato di verifica dati se alcuni match sono stati importati senza `match_scope` o senza aggregazione coerente di serie.
