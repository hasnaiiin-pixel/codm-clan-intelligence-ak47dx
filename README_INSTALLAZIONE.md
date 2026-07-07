# CLAN MANAGER AK47DX V8.2F

## Cosa corregge

- Import risultati: ripristinati i campi risultato partita, esempio nostro team 6 e avversario 0.
- Il risultato partita è distinto dal punteggio singolo player: il punteggio player resta escluso.
- Template OCR: se salvi un template con un nome, in Import viene selezionato quel template e non torna sempre a `default`.
- Calibrazione/PWA: handle più grandi e comandi touch per muovere, allargare o ridurre il riquadro selezionato.
- Import/PWA: stessi comandi touch per regolare riquadri sopra lo screenshot.
- Cache PWA aggiornata a V8.2F.

## Installazione

Copia il contenuto della cartella `codm_v81b` nella root del progetto GitHub.

Comandi:

```bash
cd C:\Users\spea4060_tmv331ef\Documents\PROGETTI\COD\CODM_CLAN_INTELLIGENCE_2_0_DEPLOYABLE_PWA_YOLO_AK47DX
npm ci --legacy-peer-deps
npm run build
git add -A
git commit -m "CLAN MANAGER V8.2F fix PWA calibrazione template risultato import"
git push origin main
```

Se Vercel non parte:

```bash
git commit --allow-empty -m "Force Vercel deploy CLAN MANAGER V8.2F"
git push origin main
```

## Dopo deploy

Apri `/version` e verifica:

```text
V8_2F_PWA_CALIBRATION_TOUCH_TEMPLATE_IMPORT_RESULT_FIX_OK
```

Poi da telefono fai `/cache-reset`, chiudi la PWA, rimuovi vecchia icona e reinstallala.

## SQL

Non serve nuovo SQL se `/events-health` è già OK.
