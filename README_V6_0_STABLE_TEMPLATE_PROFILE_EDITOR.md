# CODM AK47DX V6.0 — Stable Template Profile Editor

Versione pulita e controllata.

## Marker
- Frontend: `V6_0_STABLE_TEMPLATE_PROFILE_EDITOR_OK`
- Backend OCR consigliato: `2.0.10-v5-4-fastlane-import-stabile-ak47dx`

## Cambiamenti principali
- Import partite V5.4 FastLane mantenuto stabile.
- Data/ora partita selezionabile con campo `datetime-local`.
- Gestione template separata: tipologia telefono + nome template.
- Editor riquadri direttamente in Import risultati e Import profilo.
- Import profilo con un solo tasto, progress visibile, fallback browser se Render profilo è lento.
- Pagina `/profile` con foto, cambio password, collegamento player e storico cambio nome gioco.
- Calendario eventi migliorato con sezione “Prossimi eventi in programma”.
- Cartella root pulita: rimossi README storici e patch obsolete.

## Comandi
```bat
cd C:\Users\spea4060_tmv331ef\Documents\PROGETTI\COD\CODM_CLAN_INTELLIGENCE_2_0_DEPLOYABLE_PWA_YOLO_AK47DX
npm ci --legacy-peer-deps
npm run build
git add -A
git commit -m "fix: CODM v6.0 stable template profile editor"
git push origin main
```
