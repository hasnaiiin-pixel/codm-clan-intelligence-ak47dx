# FIX4 Integrated Logic

Questa versione integra le decisioni fatte per evitare fix casuali.

## Regole implementate

- Il risultato CED viene letto solo dall'header alto.
- Lo score CED viene accettato solo se è coerente con il risultato visivo.
- Valori tipo `5:5` o `11:11` vengono scartati se la schermata indica `VITTORIA` o `SCONFITTA`.
- Se lo score non è affidabile, il frontend svuota i campi e chiede correzione manuale invece di mantenere valori vecchi.
- Il backend espone `engine_version = 0.8.4-fix4` in `/health` e nel JSON OCR.
- Il JSON include `score_diagnostics` con candidati accettati/scartati.
- Il frontend mostra `OCR Backend Pro 0.8 FIX4` così si capisce se stai usando la versione corretta.

## Verifica

Apri:

```text
http://127.0.0.1:8765/health
```

Deve comparire:

```json
"version": "0.8.4-fix4"
```

Se vedi ancora `0.8.0`, stai avviando un backend vecchio.
