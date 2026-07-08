# CLAN MANAGER AK47DX

Release completa V9.0: gestione eventi, import risultati CODM, calibrazione OCR, utenti/ruoli, statistiche, Telegram e nuova sezione Torneo.

## Avvio locale

```bash
npm ci --legacy-peer-deps
npm run build
npm start
```

## Deploy

```bash
git add -A
git commit -m "CLAN MANAGER V9.0 complete pro release"
git push origin main
```

## Supabase

Eseguire solo `supabase/FINAL_SCHEMA_CLAN_MANAGER.sql` se devi aggiornare schema/tabelle. Gli utenti Auth non vengono cancellati.

## Versione

Aprire `/version`: deve mostrare `V9_0_COMPLETE_PRO_TOURNAMENT_IMPORT_UI_OK`.
