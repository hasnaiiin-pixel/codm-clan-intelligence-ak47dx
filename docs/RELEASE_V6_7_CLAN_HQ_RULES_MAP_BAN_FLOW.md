# CODM AK47DX V6.7 — Clan HQ, Regolamento, Mappe e BAN

## Base
Partenza: `CODM_AK47DX_V6_6_CLAN_MANAGER_EVENTS_PERSIST_ROSTER_RULES_BUILD.zip`.

## Obiettivo
Ridurre la confusione tra TAG clan e roster, migliorare Eventi/Import e trasformare il Regolamento in una pagina realmente usabile per il clan.

## Modifiche principali

### Clan HQ
- Clan HQ è la sorgente ufficiale per `Nome clan` e `TAG clan`.
- Il TAG salvato da Admin viene usato per i nuovi player registrati e per i player inseriti nel roster.
- Salvataggio Clan HQ sincronizza `clan_public_profiles`, cache locale e tabella `clans`.
- Aggiunta correzione mirata per vecchi tag/placeholder del nostro roster come `AK`, `AKঐ`, `ѦҞ`, `ѦҞঐ`, `Senza clan`.

### Eventi
- Campo `Mappa CODM` cambiato da input/datalist a select diretto: cliccando appare subito la lista mappe.
- BAN partita tradotti in italiano CODM con voci più comprensibili.
- Mantenuta griglia a 2 partite per riga su desktop.

### Import risultato
- Migliorata persistenza bozza: se esiste una bozza, la query evento non sovrascrive i campi già compilati.
- La bozza resta fino a `Salva partita`.
- Continua aggiornamento automatico di score, esito e MVP nell’evento collegato.

### Regolamento
- Pagina regolamento rifatta con sezioni preformattate.
- Logo clan in alto.
- Piccolo logo sviluppatore MIRZA.
- Sezioni con icone, testi già pronti, grafica gaming e upload immagine per ogni sezione.
- Salvataggio locale in `clan_manager_rules_v6_7_structured`.

## Verifica build
- `npm ci --legacy-peer-deps` completato.
- `npx tsc --noEmit` completato senza errori.
- `npm run build` arriva a `Compiled successfully` e `Generating static pages (33/33)`; nel sandbox resta lungo su `Collecting build traces`, come nelle build precedenti.
