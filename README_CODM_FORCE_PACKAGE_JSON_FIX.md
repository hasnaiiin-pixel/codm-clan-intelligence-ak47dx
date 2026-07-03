# CODM - Fix forzato package.json Vercel

Questo pacchetto sostituisce completamente il `package.json` rotto che genera:

```txt
Expected double-quoted property name in JSON at position 87
```

## File inclusi

- `package.json` valido JSON, senza virgole finali e senza commenti
- `.npmrc` per installazione npm stabile
- `vercel.json` con install/build command
- `scripts/validate-package-json.mjs` per verificare il JSON
- `CODM_FORCE_REPLACE_PACKAGE_JSON_WINDOWS.bat` per pulire, installare e testare

## Procedura

1. Estrai questo ZIP.
2. Copia tutti i file nella root del progetto `codm-clan-intelligence-ak47dx`.
3. Quando Windows chiede se vuoi sostituire `package.json`, scegli **Sì**.
4. Avvia `CODM_FORCE_REPLACE_PACKAGE_JSON_WINDOWS.bat`.
5. Se il controllo passa, fai:

```bat
git add package.json package-lock.json .npmrc vercel.json scripts/validate-package-json.mjs CODM_FORCE_REPLACE_PACKAGE_JSON_WINDOWS.bat README_CODM_FORCE_PACKAGE_JSON_FIX.md
git commit -m "fix: force valid package json for Vercel"
git push origin main
```

6. Su Vercel fai Redeploy senza cache.

## Controllo rapido prima del push

```bat
node scripts\validate-package-json.mjs
```

Deve stampare:

```txt
✅ package.json valido
```
