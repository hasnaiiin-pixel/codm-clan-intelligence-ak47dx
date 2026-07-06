# Release V6.6 — Clan Manager Events Persist Roster Rules

## Obiettivo
Rendere la piattaforma più coerente come **Clan Manager**, ridurre l’ingombro degli eventi, evitare perdita dati durante import risultato e automatizzare il roster quando un player si registra.

## Modifiche
- Branding app: Clan Manager.
- Eventi: 2 card partita per riga su desktop.
- Codice partita univoco per ogni partita.
- Telegram: dettaglio partite strutturato con ID, dettagli, orari, titolari, riserve, BAN, stato, score, esito e MVP.
- Import risultato: bozza locale persistente finché non viene salvata la partita.
- Regolamento clan: nuova pagina `/rules`.
- Registrazione/login/join/profilo: inserimento automatico del nome in gioco nel roster.
- Profilo: unificazione Mio profilo + profilo player.

## Verifica
- `npm ci --legacy-peer-deps`: OK.
- `npm run build`: compilazione riuscita, 33/33 pagine generate; nel sandbox resta lungo su build traces.
