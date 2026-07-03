# CODM Clan Intelligence - Fix Vercel `Module not found: Can't resolve 'tesseract.js'`

## Errore risolto

Vercel fallisce in `next build` con:

```txt
./src/lib/codmOcrEngine.ts
Module not found: Can't resolve 'tesseract.js'
Import trace:
./app/loadouts/page.tsx
```

## Cosa fa questo fix

- Aggiunge `tesseract.js` nelle `dependencies` del progetto.
- Imposta Node `24.x` per Vercel.
- Rimuove eventuale `type: module` per mantenere compatibilità con configurazione CommonJS.
- Aggiorna `package-lock.json` usando `npm install`.
- Lancia `npm run build` in locale.

## Uso

Copia questi file nella root del progetto:

```txt
.npmrc
CODM_TESSERACT_MODULE_FIX_WINDOWS.bat
scripts/apply-codm-tesseract-fix.cjs
```

Poi esegui:

```bat
CODM_TESSERACT_MODULE_FIX_WINDOWS.bat
```

Se la build locale passa, fai:

```bat
git add -A
git commit -m "fix: add tesseract OCR dependency for CODM build"
git push origin main
```

Poi su Vercel fai nuovo deploy senza cache.

## Nota

Se dopo questo compare un nuovo errore, il problema successivo non è più `tesseract.js` mancante. Copia il log completo dopo:

```txt
> next build
```
