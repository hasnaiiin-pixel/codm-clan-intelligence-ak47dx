# CODM AK47DX V6.2 - Home, Eventi, Template e Profilo stabile

Versione pulita basata su V6.1 con import partite FastLane stabile mantenuto.

## Marker
`V6_2_HOME_EVENTI_TEMPLATE_PROFILO_OK`

## Modifiche principali
- Home iniziale con nome/logo clan e mini statistiche reali.
- MVP Top 5 ordinato per MVP, poi assist come spareggio.
- Event Center con presentazione Team A vs Team B, loghi, round, titolari, riserve, Discord, lobby e stanza.
- Template telefono + nome template più robusti: se il nome era salvato in meta.templateName ora compare nella lista.
- Import profilo: timeout backend più corto e fallback browser automatico, senza resettare immagine.
- Stato OCR visibile solo a Owner/Admin.
- SQL aggiornato per event_plan e campi profilo/social/note.

## Backend OCR consigliato
Mantieni backend stabile:
`2.0.10-v5-4-fastlane-import-stabile-ak47dx`

## Comandi
```bat
npm ci --legacy-peer-deps
npm run build
git add -A
git commit -m "fix: CODM v6.2 home events template profile stable"
git push origin main
```
