# CLAN MANAGER AK47DX — V12.0 Definitive Excel + Foto + SQL Import

Release definitiva per gestione risultati CODM con tre modalità:

1. Import diretto da foto/OCR già esistente.
2. Import da Excel con numeri precisi e foto allegate.
3. Import SQL Supabase tramite staging table/funzione.

## File importanti

- `public/templates/TEMPLATE_IMPORT_RISULTATI_CODM_CLAN_MANAGER_V12_DEFINITIVO.xlsx`
- `supabase/IMPORT_RISULTATI_EXCEL_STAGING_V12.sql`
- `supabase/FINAL_SCHEMA_CLAN_MANAGER.sql`
- `foto_partite/README_FOTO_PARTITE.txt`

## Flusso consigliato

Mandi foto a ChatGPT → ChatGPT genera Excel + SQL + cartella foto → carichi Excel in app → scegli partita se ci sono più ID_PARTITA → alleghi foto ora o dopo → salvi su Supabase.

## Installazione

```bash
npm ci --legacy-peer-deps
npm run build
```

## Deploy

```bash
git add -A
git commit -m "CLAN MANAGER V12.0 definitive excel photo sql import"
git push origin main
```
