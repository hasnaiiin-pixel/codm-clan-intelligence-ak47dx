# CLAN MANAGER AK47DX V13.11.1

Correzione build Vercel per il componente di analytics visite.

## Correzione

- `PageViewTracker` spostato in `app/PageViewTracker.tsx`.
- Import aggiornato in `app/layout.tsx` con percorso relativo.
- Rimossa da `.gitignore` la regola generica `components/`, che poteva escludere nuovi componenti dal commit Git.
- Nessuna modifica alla logica di statistiche, eventi, Telegram, fondo estrazioni, K/D/A, OCR o import risultati.

## Verifica

Eseguire:

```bash
npm ci --legacy-peer-deps
npm run build
```
