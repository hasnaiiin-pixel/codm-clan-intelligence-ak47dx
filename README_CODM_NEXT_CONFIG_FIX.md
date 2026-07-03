# CODM Clan Intelligence - Fix next.config.js / type module

## Problema risolto

Vercel arriva a `next build`, ma fallisce con:

```txt
ReferenceError: module is not defined in ES module scope
This file is being treated as an ES module because package.json contains "type": "module".
```

Nel progetto CODM il file `next.config.js` usa sintassi CommonJS:

```js
module.exports = nextConfig
```

Questa sintassi funziona correttamente quando il progetto non forza tutti i file `.js` come ES Module.

## Cosa fa il fix

- Rimuove `"type": "module"` da `package.json`.
- Mantiene `next.config.js` in formato CommonJS.
- Imposta Node a `24.x` per Vercel.
- Mantiene gli script `.mjs` funzionanti perché `.mjs` resta ES Module anche senza `type: module`.

## Procedura

1. Copia tutti i file di questo pacchetto nella root del progetto.
2. Avvia:

```bat
CODM_NEXT_CONFIG_FIX_WINDOWS.bat
```

3. Se la build locale passa, fai:

```bat
git add package.json package-lock.json scripts/apply-codm-next-config-fix.cjs CODM_NEXT_CONFIG_FIX_WINDOWS.bat README_CODM_NEXT_CONFIG_FIX.md
git commit -m "fix: resolve Next config module format on Vercel"
git push origin main
```

4. Su Vercel fai deploy senza cache.

## Nota

Non vengono toccate pagine, dashboard, Supabase, clan, roster, statistiche o UI gaming.
