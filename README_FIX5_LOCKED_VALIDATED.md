# FIX5 LOCKED VALIDATED

Questa versione blocca i fix casuali e introduce una pipeline controllata:

1. Frontend e backend devono avere la stessa versione: `0.8.5-fix5-locked`.
2. Il backend gira su porta dedicata `8770`, così non si confonde con backend vecchi su `8765`.
3. Il frontend blocca l'OCR se `/health` non risponde con la versione corretta.
4. Le statistiche player sono mostrate subito anche nella card destra, non solo in fondo pagina.
5. È incluso un regression test sul campione CED `VITTORIA 6:0`.

## Avvio

```bat
setup_ocr_backend.bat
start_all.bat
```

## Verifica backend

Apri:

```text
http://127.0.0.1:8770/health
```

Deve comparire:

```json
"version": "0.8.5-fix5-locked"
```

## Test regressione

Esegui:

```bat
run_ocr_regression_test.bat
```

Il test verifica:

- risultato WIN
- score 6:0
- 5 righe blu e 5 righe rosse
- righe blu corrette: score, K/D/A, impatto
- MVP vincente/perdente

Se il test fallisce, la build non deve essere usata per import automatico.
