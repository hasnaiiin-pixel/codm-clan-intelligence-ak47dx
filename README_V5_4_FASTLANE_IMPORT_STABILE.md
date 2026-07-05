# CODM AK47DX V5.4 - FASTLANE IMPORT STABILE

Questa versione corregge il problema reale dell'import online:

- blocco al 10% durante /health Render
- blocco all'86% durante OCR pesante
- template personalizzato che fa partire troppe letture OCR
- K/D/A e Score che non arrivano in tabella

## Cambio tecnico

V5.4 usa una modalità FastLane:

- niente health bloccante prima dell'import
- import diretto verso Render
- una lettura numerica per riga del nostro team
- fallback singolo su SCORE/KDA
- niente ricostruzione pesante V4.7/V4.8
- niente OCR statistiche avversarie

Backend richiesto:

```text
2.0.10-v5-4-fastlane-import-stabile-ak47dx
```

Frontend marker:

```text
V5_4_FASTLANE_IMPORT_STABILE_OK
```

## Aggiornamento

1. Nella cartella progetto tieni solo `.git` e `.env.local`.
2. Copia il contenuto interno dello ZIP.
3. Esegui:

```bat
npm ci --legacy-peer-deps
npm run build
```

4. Push:

```bat
git add -A
git commit -m "fix: CODM v5.4 fastlane import stabile"
git push origin main
```

## Render

Aggiorna Render con la cartella `ocr-backend` di questa versione.
Controlla:

```text
https://ak47dx-ocr-backend.onrender.com/health
```

Deve rispondere con versione 2.0.10.
