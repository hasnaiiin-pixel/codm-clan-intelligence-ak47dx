# CODM AK47DX V4.7 - Template Priority Import

Questa versione è concentrata sul problema più importante: l'import partita deve usare i riquadri salvati in calibrazione, senza spostarli.

## Fix principali

- Import OCR usa priorità assoluta ai riquadri template `BLUE_Rx_NICK`, `BLUE_Rx_KDA`, `RED_Rx_NICK`, `RED_Rx_KDA`.
- Se questi riquadri esistono, il backend NON ricostruisce più le celle da `TEAM_BLUE_TABLE_FULL` / `TEAM_RED_TABLE_FULL`.
- L'overlay in import mostra tutti i riquadri template applicati, non solo quelli letti.
- Backend OCR aggiornato a `2.0.6-v4-7-template-priority-import-ak47dx`.
- Frontend accetta questa versione e invia `template_priority=true` e `debug_boxes=all_template`.

## Priorità elementi letti

In V4.7 l'import legge solo:

- nickname nostro team
- Kill / Death / Assist nostro team
- score partita blu/rosso
- mappa/modalità/data se disponibili

Non legge statistiche player avversari, score player o impatto.

## Come usarla

1. Sostituisci i file progetto lasciando solo `.git` e `.env.local`.
2. Esegui:
   ```bat
   npm ci --legacy-peer-deps
   npm run build
   ```
3. Push:
   ```bat
   git add -A
   git commit -m "fix: CODM v4.7 template priority import"
   git push origin main
   ```
4. Aggiorna anche Render usando la cartella `ocr-backend` inclusa nello ZIP.
5. Verifica Render:
   ```txt
   https://ak47dx-ocr-backend.onrender.com/health
   ```
   Deve mostrare `2.0.6-v4-7-template-priority-import-ak47dx`.
6. Su Vercel apri `/version` e verifica marker `V4_7_TEMPLATE_PRIORITY_IMPORT_OK`.
7. Fai `/cache-reset` dal telefono.
8. Test import:
   - Vai in `/calibration` e controlla/salva template.
   - Vai in `/import/match`.
   - Carica la stessa immagine.
   - Scegli noi BLU o ROSSI.
   - Importa.
   - Se i riquadri overlay non coincidono con calibrazione, esporta il template da calibrazione e segnala il file JSON.
