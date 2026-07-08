# CLAN MANAGER AK47DX — V13 Generic Event + Home + PWA Horizontal

Questa release parte dalla V12.1 e modifica solo le aree richieste, senza cambiare il flusso funzionante di import Excel, foto prova e profili reali.

## Modifiche incluse

- Evento generico leggero: nome evento, data/ora, descrizione, stato evento, cover, logo nostro clan e logo avversario/organizzatore.
- Flag “Aggiungi partite in una fase successiva” attivo di default.
- Evento salvabile anche senza partite, convocati, titolari, riserve, BAN o risultati.
- In modifica evento è possibile aggiungere la prima partita, aggiungere altre partite o togliere partite.
- Eventi da fare in PWA con presentazione orizzontale: logo nostro clan → VS → logo avversario.
- Home più ricca graficamente: hero gaming, logo clan, accessi rapidi, prossimo evento, card riepilogo e barre modalità.
- Menu bottom PWA su una sola riga con 6 voci.

## Installazione locale

```bash
cd CLAN_MANAGER_AK47DX
npm ci --legacy-peer-deps
npm run build
npm start
```

## Deploy GitHub / Vercel

```bash
cd CLAN_MANAGER_AK47DX
npm ci --legacy-peer-deps
npm run build
git add -A
git commit -m "CLAN MANAGER V13 generic event home pwa horizontal"
git push origin main
```

## Verifica rapida

1. Aprire `/events`.
2. Premere “Aggiungi evento”.
3. Inserire solo nome, data/ora, descrizione, stato, cover e loghi.
4. Lasciare attivo “Aggiungi partite in una fase successiva”.
5. Salvare: l’evento deve comparire senza obbligo di partite.
6. Riaprire l’evento e premere “+ Aggiungi partita”.
7. Su PWA mobile verificare che il blocco evento resti orizzontale: logo nostro clan, VS, logo avversario.
8. Su Home verificare le nuove card grafiche e il menu basso su una sola riga.
