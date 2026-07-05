# CODM AK47DX V5.0 — Import definitivo SCORE + K/D/A

Questa versione nasce per chiudere il problema import partite.

## Obiettivo

Mantenere il motore stabile V4.6, ma aggiungere la lettura dei punteggi player.

## Cosa cambia

- Backend OCR: `2.0.8-v5-0-import-score-kda-definitivo-ak47dx`
- Frontend marker: `V5_0_IMPORT_SCORE_KDA_DEFINITIVO_OK`
- Import legge SOLO il nostro team scelto BLU/ROSSO.
- Avversari non vengono importati come statistiche player.
- Avversario salvato solo come clan, score team ed esito.
- Usa i riquadri del template salvato per:
  - nome giocatore
  - score player
  - Kill/Death/Assist
- Se mancano box individuali, usa fallback table-lock leggero con SCORE + K/D/A.
- Niente V4.7/V4.8 pesanti come motore principale.

## Deploy

1. Copia il contenuto dello zip nella root progetto, mantenendo `.git` e `.env.local`.
2. Esegui:

```bat
npm ci --legacy-peer-deps
npm run build
```

3. Push:

```bat
git add -A
git commit -m "fix: CODM v5.0 import score kda definitivo"
git push origin main
```

## Render OCR

Aggiorna Render con la cartella `ocr-backend` di questa versione.

Poi apri:

```txt
https://ak47dx-ocr-backend.onrender.com/health
```

Deve uscire:

```txt
2.0.8-v5-0-import-score-kda-definitivo-ak47dx
```

## Test

1. Apri `/version` e verifica `V5_0_IMPORT_SCORE_KDA_DEFINITIVO_OK`.
2. Apri `/cache-reset`.
3. Apri `/ocr-status`.
4. Apri `/import/match`.
5. Carica screenshot originale.
6. Scegli BLU/ROSSO.
7. Importa.
8. Deve compilare Score + K/D/A per i 5 player del nostro team.
