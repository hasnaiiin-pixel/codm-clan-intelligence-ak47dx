# CODM Clan Intelligence 2.0.1 Deployable PWA YOLO - AK47DX

Versione 2.0 resa distribuibile al clan.

## Incluso

- Dashboard gaming AK47DX.
- Action Panel con screenshot partita visibile nella pagina.
- Archivio partite, players, clan, analytics.
- Invito giocatori con link + QR.
- Pagina iscrizione `/join`.
- PWA installabile su telefono.
- Vercel config per frontend.
- Supabase Storage/Auth/DB migration.
- Backend OCR FastAPI Docker-ready.
- Render free-ready.
- Cloud Run-ready.
- Dataset YOLO/OCR-ready.

## Avvio locale

```bat
setup_ocr_backend.bat
npm.cmd install
start_all.bat
```

Backend:

```text
http://127.0.0.1:8780/health
```

Versione attesa:

```json
"version": "2.0.1-deployable-pwa-yolo-ak47dx"
```

## Deploy gratuito / economico

Leggi:

```text
docs/DEPLOYMENT_FREE_AK47DX.md
```

## YOLO

Leggi:

```text
docs/YOLO_REQUIREMENTS_AK47DX.md
```

## Supabase

Esegui nel SQL Editor Supabase:

```text
supabase/migration_2_0_definitive_ak47dx.sql
supabase/migration_2_0_deployable_pwa_yolo_ak47dx.sql
```

## Pagine importanti

```text
/dashboard
/import/match
/matches
/players
/clan
/invite
/join
/deploy
/yolo
```
