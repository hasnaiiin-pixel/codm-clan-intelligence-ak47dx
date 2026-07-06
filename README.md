# CODM AK47DX V5.9 — Stable Import + Profile Safe Templates

Versione pulita.

## Marker frontend
`V5_9_STABLE_IMPORT_PROFILE_TEMPLATES_OK`

## Backend OCR
Consigliato: `2.0.13-v5-9-stable-import-profile-templates-ak47dx`.
Il motore import partite FastLane V5.4 è mantenuto: non è stato riscritto.

## Cosa è stato sistemato
- Import risultati: mantenuto V5.4 FastLane stabile.
- Import profilo: un solo tasto, niente secondo pulsante fallback.
- Import profilo: progress percentuale e health non bloccante.
- Import profilo: invio frame frontend/manuale al backend.
- Template: selezione separata telefono/template usando chiave `telefono__template`.
- Import risultati e profilo: centratura manuale immagine/frame.
- Cartella pulita: rimossi README vecchi e patch storiche dalla root.

## Comandi manuali
```bat
cd C:\Users\spea4060_tmv331ef\Documents\PROGETTI\COD\CODM_CLAN_INTELLIGENCE_2_0_DEPLOYABLE_PWA_YOLO_AK47DX
npm ci --legacy-peer-deps
npm run build
git add -A
git commit -m "fix: CODM v5.9 stable import profile templates"
git push origin main
```

## Render
Aggiorna Render solo con la cartella `ocr-backend` di questa versione se vuoi usare OCR profilo V5.9 con frame frontend.

Dopo deploy Render:
`https://ak47dx-ocr-backend.onrender.com/health`

deve mostrare:
`2.0.13-v5-9-stable-import-profile-templates-ak47dx`
