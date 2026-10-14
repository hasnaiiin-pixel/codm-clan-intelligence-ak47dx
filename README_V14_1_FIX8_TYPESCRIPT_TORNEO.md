# AK47DX V14.1 TEST — FIX8 TypeScript Tornei

## Motivo
Vercel compilava Next.js ma bloccava il controllo TypeScript in `app/tournament/page.tsx` riga 135: `Property team_side does not exist on type GenericStringError`.

Il selettore del torneo interroga tabelle Supabase usando un elenco di colonne dinamico. Il parser dei tipi di Supabase non puo dedurre la forma delle righe da una stringa dinamica.

## Correzione
- Prima di accedere a `team_side` si verifica che `data` sia un array e le righe sono considerate oggetti con campi dinamici (`Record<string, unknown`).
- Si mantiene il filtro `ENEMY` per non proporre avversari tra gli iscritti.
- Il caricamento di roster, statistiche storiche e iscrizioni precedenti rimane invariato.
- Non vengono alterati database, risultati, SQL, stagioni o statistiche.

## Installazione patch
1. Estrai lo ZIP nella cartella sorgente del progetto, mantenendo la struttura delle directory.
2. Sostituisci `app/tournament/page.tsx`.
3. Da PowerShell, nella cartella del progetto, esegui:

```powershell
npm ci --legacy-peer-deps
npm run build
```

4. Soltanto se la build passa:

```powershell
git add -A
git commit -m "AK47DX V14.1 FIX8 TypeScript torneo"
git push origin main
```

## Verifica
- Accedi a Tornei -> Iscrizioni e prova ricerca e selezione di giocatori.
- Verifica che il sistema non suggerisca avversari, e che i nomi dei giocatori importati siano disponibili.
- Se la lista resta vuota, controlla avviso sulle tabelle e permessi RLS.
- Se Vercel mostra un nuovo errore TypeScript, riportare il primo blocco di errore.

### Collaudo
Controllati i parser TypeScript dei sorgenti e integrita degli ZIP. NON verificato `npm run build` in ambiente locale: registry npm non raggiungibile (EAI_AGAIN). Non e una release stabile.
