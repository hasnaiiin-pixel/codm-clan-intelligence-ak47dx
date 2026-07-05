# CODM AK47DX V5.3 IMPORT NO ABORT TEMPLATE TABLE

Versione frontend per evitare abort/cold-start Render su import partita. Backend OCR stabile: `2.0.9-v5-2-template-kda-table-definitivo-ak47dx`.

Marker `/version`: `V5_3_IMPORT_NO_ABORT_TEMPLATE_TABLE_OK`.

# CODM AK47DX — V5.2 Template K/D/A Table Definitivo

Usa questa versione come base stabile per import partite.

- Frontend marker: `V5_2_TEMPLATE_KDA_TABLE_DEFINITIVO_OK`
- OCR backend: `2.0.9-v5-2-template-kda-table-definitivo-ak47dx`

Passi rapidi:

```bat
npm ci --legacy-peer-deps
npm run build
git add -A
git commit -m "fix: CODM v5.2 template kda table definitivo"
git push origin main
```

Aggiorna anche Render con la cartella `ocr-backend` e verifica `/health`.
