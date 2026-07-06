# CODM AK47DX V5.8 - Rollback stabile import

Questa versione non introduce un nuovo motore OCR. Riporta la base a quella stabile:

- Import partite: V5.4 FastLane stabile
- Backend OCR: 2.0.10-v5-4-fastlane-import-stabile-ak47dx
- Logo MIRZA e medaglie mantenuti
- Reset database pulito mantenuto
- Profilo isolato: non deve rompere import risultati

## Comandi manuali

```bat
cd C:\Users\spea4060_tmv331ef\Documents\PROGETTI\COD\CODM_CLAN_INTELLIGENCE_2_0_DEPLOYABLE_PWA_YOLO_AK47DX
npm ci --legacy-peer-deps
npm run build
git add -A
git commit -m "fix: CODM v5.8 rollback import stabile"
git push origin main
```

## Render

Deployare la cartella `ocr-backend` di questa versione. `/health` deve mostrare:

`2.0.10-v5-4-fastlane-import-stabile-ak47dx`

Non usare backend 2.0.11 o 2.0.12 perché hanno rotto anche import risultati.
