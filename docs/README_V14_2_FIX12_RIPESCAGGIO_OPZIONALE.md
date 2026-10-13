# AK47DX V14.2 TEST — FIX12: RIPESCAGGIO OPZIONALE A GIRONI O ELIMINAZIONE DIRETTA

## Base di partenza
La patch e' stata creata sopra la V14.2 TEST FIX11 (GIRONI_RIPESCAGGIO). Non sostituire l'intero sito quando basta la patch.

## Nuove funzioni
- Seleziona formato fase iniziale: Solo eliminazione diretta oppure Gironi + playoff.
- Per il torneo con gironi, scegli il ripescaggio: **Da decidere dopo i gironi**, **Nessun ripescaggio**, **Tutte le non qualificate -> nuovi gironi** oppure **Tutte le non qualificate -> eliminazione diretta**.
- Il ripescaggio coinvolge tutte le squadre non qualificate dei gironi principali, senza duplicati.
- Scegli 1 o 2 posti ripescaggio per raggiungere i playoff; ogni percorso assegna un posto.
- La fase a gironi di ripescaggio mostra classifiche separate e risultati, e qualifica la prima di ciascun girone al termine di tutti gli incontri.
- La fase a eliminazione diretta mostra gli incontri del ripescaggio in un tabellone e qualifica le vincitrici delle finali; gestisce i BYE.
- Nessun ripescaggio: entrano nei playoff soltanto le squadre qualificate direttamente; gli slot liberi sono BYE, non ripescaggi impliciti.
- Formato scelto salvato nel JSON `codm_tournaments.rules`: `second_chance`, `second_chance_pending`, `second_chance_format`, `second_chance_slots`.
- Nessuna cancellazione o migrazione dei tornei gia' conclusi. Se playoff o ripescaggio sono stati generati, la scelta viene bloccata per evitare modifiche ai risultati.

## Installazione FIX12 (sopra FIX11)
1. Conserva copia del progetto e fai backup Supabase.
2. Estrai lo ZIP patch nella cartella principale del progetto Git, preservando la struttura delle directory.
3. Sostituisci `app/tournament/page.tsx`; aggiungi `src/lib/tournamentRepechage.ts`.
4. Esegui:

```powershell
cd "C:\PERCORSO\CLAN_MANAGER_AK47DX"
npm ci --legacy-peer-deps
npm run build
```

5. Solo se la build e' riuscita:

```powershell
git add -A
git commit -m "AK47DX V14.2 FIX12 ripescaggio gironi o eliminazione"
git push origin main
```

FIX12 non richiede SQL aggiuntivo rispetto alla V14.2 FIX10/FIX11. I permessi Supabase esistenti devono consentire la scrittura nel torneo.

## Collaudo suggerito
1. Crea un torneo DI PROVA con 11 squadre (senza toccare tornei reali gia' avviati).
2. Seleziona Gironi + playoff, 3 gironi, 2 qualificate per girone, Ripescaggio DA DECIDERE; genera gironi e registra i risultati.
3. Verifica che non sia possibile generare i playoff finche' il ripescaggio e' da decidere.
4. Seleziona Ripescaggio a gironi con 2 posti: le 5 escluse formeranno gruppi da 3 e 2, con 4 partite totali. Completa la classifica: le prime di ciascun gruppo passano ai playoff.
5. Ripeti in un NUOVO torneo di prova con ripescaggio a eliminazione diretta e 2 posti: tutte le 5 escluse entrano nei due percorsi con BYE ove necessario; le vincenti delle finali passano ai playoff.
6. Verifica orari, modalita', mappe, nomi giocatori e colorazione dei qualificati.
7. Prova Nessun ripescaggio su un ALTRO torneo: le escluse non devono rientrare; eventuali slot vuoti saranno BYE.
8. Controlla il comportamento da smartphone e i risultati su Supabase.

## Verifiche eseguite per la patch
- Parse TypeScript/TSX: nessun errore sintattico nella pagina e nell'helper.
- Test automatici degli abbinamenti per 2-25 squadre, gruppi da 1/2 percorsi: passati.
- Test di generazione ripescaggio con 11 squadre e 5 escluse, per entrambe le modalita' e 1/2 posti: passati.
- Resta NON VERIFICATA la build Next.js completa, poiche' `node_modules` nel workspace non contiene i pacchetti necessari; va eseguito `npm run build` localmente o su Vercel.
- Non e' stato possibile collaudare il salvataggio sul database Supabase reale.

Non applicare script di DROP/RESET e non ricaricare dati storici durante l'installazione.
