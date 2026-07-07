# CLAN MANAGER AK47DX V8.2B - Import/Calibrazione/Link Fix

## Cosa corregge
- Import risultati usa lo stesso frame reale della calibrazione.
- L'immagine in import non viene più deformata da `preview`, `max-height` o `object-fit`.
- I riquadri in import e calibrazione usano stessa logica `regionToImageStyle(region, frame)` sullo stesso contenitore immagine.
- Il menu telefono/template in calibrazione mostra sempre la lista tramite select, senza dover cancellare il campo.
- Puoi ancora scrivere nomi telefono/template con maiuscole, spazi e simboli.
- Gli eventi non generano più link Google Calendar automatico: i link evento sono solo quelli scelti da te in Link Discord / Link lobby / Note.
- Vercel Hobby resta compatibile: nessun cron nel vercel.json.

## SQL
Se hai già applicato lo schema V8.2/V8.1C e /events-health è OK, non serve nuovo SQL.

## Comandi
```bash
cd cartella-progetto
npm ci --legacy-peer-deps
npm run build
git add -A
git commit -m "CLAN MANAGER V8.2B fix import calibrazione link evento"
git push origin main
```

## Dopo deploy
Apri `/version` e verifica:
`V8_2B_IMPORT_CALIBRATION_LINK_FIX_OK`

Poi svuota PWA:
1. Apri `/cache-reset`
2. Premi pulizia cache
3. Chiudi PWA
4. Rimuovi icona Home
5. Riapri sito Vercel e aggiungi di nuovo alla Home

## Test
1. Apri `/calibration`, carica screenshot e controlla riquadri.
2. Apri `/import/match`, carica la stessa immagine.
3. Seleziona stesso telefono/template in alto.
4. I riquadri devono avere la stessa posizione relativa della calibrazione.
5. Crea evento e controlla che non venga aggiunto Google Calendar automatico.
