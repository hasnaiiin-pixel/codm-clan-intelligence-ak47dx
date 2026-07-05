# CODM AK47DX V4.8 - Eventi + OCR definitivo template priority

Questa versione corregge due punti prioritari:

1. **Eventi:** la pagina `/events` ora mostra conteggi e lista eventi con filtro `Solo futuri / Tutti / Passati`, pulsante `Ricarica`, messaggi di errore più chiari e calendario mensile con evidenza date.
2. **Import partita:** il backend OCR usa ancora il template salvato, ma ora legge K/D/A con crop più largo, più scale OCR e fallback robusto. Non ricostruisce le celle dalla tabella se esistono i riquadri `BLUE/RED_Rx_NICK` e `BLUE/RED_Rx_KDA`.

## Marker versione

Apri `/version` e verifica:

```txt
V4_8_EVENTI_OCR_DEFINITIVO_OK
```

## Backend OCR Render

Dopo il deploy Render, `/health` deve mostrare:

```txt
2.0.7-v4-8-events-ocr-definitive-ak47dx
```

## Test import

1. Apri `/calibration` e controlla i riquadri NICK/KDA.
2. Salva template.
3. Apri `/import/match`.
4. Carica screenshot originale.
5. Scegli noi BLU/ROSSO.
6. Importa.
7. Se OCR resta basso, controlla `Debug OCR grezzo`: ora include `V4.8 template priority` e debug candidati K/D/A.

## Test eventi

1. Apri `/events`.
2. Crea un evento futuro.
3. Premi `Ricarica`.
4. Controlla conteggi: `Caricati`, `futuri`, `passati`.
5. Usa filtro `Tutti` se non lo vedi in `Solo futuri`.

## Aggiornamento

- Copia il contenuto interno dello ZIP nella root progetto.
- Mantieni solo `.git` e `.env.local` dalla cartella vecchia.
- Esegui:

```bat
npm ci --legacy-peer-deps
npm run build
git add -A
git commit -m "fix: CODM v4.8 eventi OCR definitivo"
git push origin main
```

Poi aggiorna anche Render con la cartella `ocr-backend`.
