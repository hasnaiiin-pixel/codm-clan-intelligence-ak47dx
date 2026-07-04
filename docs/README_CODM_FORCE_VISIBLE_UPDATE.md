# CODM Force Visible Update / Version Check

Questa patch serve quando Vercel risulta deployato ma nel browser/telefono si vede ancora la versione vecchia.

Aggiunge:

- `/version` per vedere il codice versione del deploy
- `/cache-reset` per cancellare cache browser, cache PWA e service worker
- `public/deploy-version.json` per verifica rapida

## Uso

1. Copia tutti i file nella root del progetto CODM.
2. Avvia:

```bat
APPLICA_CODM_FORCE_VISIBLE_UPDATE.bat
```

3. Se `npm run build` passa:

```bat
git add -A
git commit -m "chore: add visible deploy version check"
git push origin main
```

4. Su Vercel controlla che parta un deploy con commit nuovo.
5. Apri:

```txt
https://tuo-link-vercel.vercel.app/version
```

6. Dal telefono apri:

```txt
https://tuo-link-vercel.vercel.app/cache-reset
```

e premi il pulsante di pulizia.
