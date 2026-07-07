# CLAN MANAGER AK47DX V8.2E

## Modifiche
- Import partite: rimosso solo riquadro VITTORIA/Sconfitta, riquadri grandi blu/rosso e IMPATTO.
- Import partite: PUNTEGGIO resta attivo, insieme a Nick e K/D/A.
- PWA/mobile: migliorata visualizzazione inserimento dati tabella sotto import.
- Calibrazione: un solo nome template, salvabile con maiuscole, spazi e simboli.
- Dashboard/Home: pulita, senza hero/logo/testi spiegazione/tasti inutili.
- Eventi: quando l’orario di fine evento è passato, l’evento passa nei precedenti.

## Comandi
```bash
cd cartella-progetto
npm ci --legacy-peer-deps
npm run build
git add -A
git commit -m "CLAN MANAGER V8.2E import punteggio template dashboard eventi"
git push origin main
```

## Dopo deploy
Apri `/version` e controlla marker:
`V8_2E_PWA_CACHE_RESULT_SCORE_TEMPLATE_DASHBOARD_FIX_OK`

Se usi PWA, apri `/cache-reset`, pulisci cache, chiudi app, rimuovi icona Home e reinstallala.

## SQL
Non serve nuovo SQL se `/events-health` è già OK.
