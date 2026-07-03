# CODM Clan Intelligence - Fix package.json Vercel

Errore risolto:

```txt
/vercel/path0/package.json: Expected double-quoted property name in JSON at position 87
```

Questo pacchetto contiene un `package.json` JSON valido, senza virgole finali e con Node 20.x impostato per Vercel.

## Come usarlo

1. Estrai questo ZIP.
2. Copia `package.json`, `.npmrc` e `CODM_FIX_PACKAGE_JSON_WINDOWS.bat` nella root del progetto.
3. Quando Windows chiede se vuoi sostituire `package.json`, scegli Sì.
4. Esegui:

```bat
CODM_FIX_PACKAGE_JSON_WINDOWS.bat
```

5. Se la build locale va bene:

```bat
git add package.json package-lock.json .npmrc
git commit -m "fix: correct package json for Vercel"
git push origin main
```

6. Su Vercel fai Redeploy senza cache.

## Nota importante

Questo file è una base Next.js/Supabase per il progetto CODM. Se dopo questo fix Vercel segnala `Module not found`, significa che nel progetto stai usando una libreria non elencata nelle dependencies. In quel caso basta aggiungerla e rifare `npm install`.
