# CODM AK47DX V6.1 — Import editor, template, profilo UI

Versione pulita basata su import risultati V5.4 FastLane stabile.

## Modifiche principali
- Import risultati: riquadri modificabili direttamente sopra l'immagine con mouse/dito, come Calibrazione.
- Import profilo: riquadri modificabili direttamente sopra l'immagine con mouse/dito.
- Template OCR: telefono e nome template separati. Esempio: `iphone_17px` + `ced`, `postazione`, `dominio`, `profilo_base`.
- Lista template: ora legge i nomi salvati dal contenuto del template, non dal suffisso errato della chiave localStorage.
- Profilo utente: foto, cambio password, storico nome gioco, descrizione, Instagram, TikTok, YouTube, Discord, note e shortcut Import profilo.
- Menu: rimosso `Entra nel clan`; clan unico associato automaticamente e gestibile da admin.
- Stato OCR visibile solo Owner/Admin nel menu.
- Statistiche clan ordinate come medagliere: Oro/MVP, Argento, Bronzo, Legno, Olimpico.
- Root pulita: niente vecchi README patch.

## Backend OCR
Per non rompere import risultati, la V6.1 accetta ancora backend stabile:
`2.0.10-v5-4-fastlane-import-stabile-ak47dx`.

## Comandi
```bat
cd C:\Users\spea4060_tmv331ef\Documents\PROGETTI\COD\CODM_CLAN_INTELLIGENCE_2_0_DEPLOYABLE_PWA_YOLO_AK47DX
npm ci --legacy-peer-deps
npm run build
git add -A
git commit -m "fix: CODM v6.1 import editor template profile ui"
git push origin main
```

## Marker
Apri `/version` e verifica:
`V6_1_IMPORT_EDITOR_TEMPLATE_PROFILE_UI_OK`
