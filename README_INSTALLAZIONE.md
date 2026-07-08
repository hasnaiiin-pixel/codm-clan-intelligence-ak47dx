# Installazione CLAN MANAGER V12.0

1. Copia il contenuto della cartella `codm_v81b` nella root del progetto.
2. Esegui i comandi:

```bash
cd C:\Users\spea4060_tmv331ef\Documents\PROGETTI\COD\CODM_CLAN_INTELLIGENCE_2_0_DEPLOYABLE_PWA_YOLO_AK47DX
npm ci --legacy-peer-deps
npm run build
git add -A
git commit -m "CLAN MANAGER V12.0 definitive excel photo sql import"
git push origin main
```

3. Su Supabase esegui:

```text
supabase/FINAL_SCHEMA_CLAN_MANAGER.sql
supabase/IMPORT_RISULTATI_EXCEL_STAGING_V12.sql
```

4. Dopo deploy apri `/version` e verifica:

```text
V12_0_DEFINITIVE_EXCEL_PHOTO_SQL_IMPORT_OK
```
