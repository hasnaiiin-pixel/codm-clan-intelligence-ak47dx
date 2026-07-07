# CLAN MANAGER AK47DX V8.2C

## Cosa corregge

- Import risultati semplificato: non mostra più riquadri Vittoria, Punteggio e Impatto.
- Template OCR semplificato: un solo nome template, `default` oppure un nome salvato.
- Menu import sistemato: file, template, calibrazione e import restano dentro pagina.
- Layout import più pulito e compatibile con mobile/PWA.
- Link evento solo manuali: Discord/Lobby/Note, niente link Calendar automatico.
- Telegram: quando cancelli evento, il messaggio è evidenziato chiaramente.

## Deploy

```bash
cd cartella-progetto
npm ci --legacy-peer-deps
npm run build
git add -A
git commit -m "CLAN MANAGER V8.2C import pulito template telegram delete"
git push origin main
```

## Verifica dopo deploy

Apri:

```text
/version
```

Deve mostrare:

```text
V8_2C_IMPORT_CLEAN_TEMPLATE_TELEGRAM_DELETE_FIX_OK
```

Poi, sul telefono, fare una volta:

```text
/cache-reset
chiudi PWA
rimuovi icona Home
riapri sito Vercel
aggiungi di nuovo alla schermata Home
```
