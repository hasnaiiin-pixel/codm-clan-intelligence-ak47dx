# Clan Manager — CODM AK47DX V6.7

Build preparata partendo da `CODM_AK47DX_V6_6_CLAN_MANAGER_EVENTS_PERSIST_ROSTER_RULES_BUILD.zip`.

## Controllo eseguito
- `npm ci --legacy-peer-deps` OK.
- `npm run build` OK fino a `Compiled successfully` e `Generating static pages (33/33)`.
- Nel sandbox Next resta lungo su `Collecting build traces`, comportamento già visto nelle build precedenti. Su PC/Vercel verificare con Node 24.x.

## Cambi principali V6.7
- Clan HQ diventa la sorgente ufficiale: **Nome clan** e **TAG clan** vengono salvati e usati per i nuovi player/registrazioni.
- Fix confusione TAG roster: i nuovi player non prendono più tag vecchi tipo `ѦҞঐ`; prendono il tag impostato da Admin in Clan HQ, esempio `AK47DX`.
- Salvataggio Clan HQ sincronizza anche la tabella `clans` e corregge i vecchi placeholder del roster quando possibile.
- Pagina Eventi: campo **Mappa CODM** trasformato in menu a tendina diretto, non più cella da cancellare.
- BAN partita tradotti in italiano CODM e divisi per armi, tattiche/letali, perk, operator skill e scorestreak.
- Import risultato da Eventi: la bozza non viene sovrascritta dai dati vuoti dell’evento quando ricarichi o cambi tab; resta fino a **Salva partita**.
- Pagina **Regolamento clan** rifatta: sezioni preformattate, logo clan, piccolo logo sviluppatore MIRZA, simboli, regole già compilate e immagini caricabili per ogni sezione.
- Header aggiornato a **CLAN MANAGER** e menu Clan HQ più chiaro.

## Comandi consigliati
```bash
npm ci --legacy-peer-deps
npm run build
npm run dev
```

## Commit suggerito
```bash
git add -A
git commit -m "fix: CODM v6.7 clan hq rules map ban flow"
git push origin main
```
