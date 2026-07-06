# CODM AK47DX V6.3 - Event planner, template fix, profilo stats

Versione pulita. Backend OCR risultati lasciato stabile: 2.0.10-v5-4-fastlane-import-stabile-ak47dx.

## Controllo eseguito
- npm ci --legacy-peer-deps
- npm run build
- Build OK: Compiled successfully, 32/32 pagine generate.

## Cambi principali
- Logo clan caricabile con file picker da Clan HQ, senza scrivere percorso.
- Eventi: cover presentazione, loghi Team A/B da file, partite aggiungi/togli con default 1.
- Per ogni partita evento: modalità, mappa, target, titolari, riserve, ritrovo, apertura lobby, orario partita, BAN, risultato, score, MVP.
- Home: riepilogo clan + eventi futuri/scrim.
- Profilo: statistiche individuali in basso.
- Calibrazione: telefono e nome template separati con salvataggio robusto.
- Import partite/profilo: quando scegli telefono, ora preferisce il template salvato invece di restare su default.
- Stato OCR rimane visibile solo a staff/owner tramite menu permessi.

## Comandi
cd C:\Users\spea4060_tmv331ef\Documents\PROGETTI\COD\CODM_CLAN_INTELLIGENCE_2_0_DEPLOYABLE_PWA_YOLO_AK47DX
npm ci --legacy-peer-deps
npm run build
git add -A
git commit -m "fix: CODM v6.3 event planner template fix"
git push origin main
