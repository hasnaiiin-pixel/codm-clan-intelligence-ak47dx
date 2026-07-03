# CODM / AK47DX - Fix Node 24 per Vercel

Questo fix serve dopo il log Vercel:

```txt
Error: Node.js version 20.x is deprecated.
Please set "engines": { "node": "24.x" }
```

## Cosa modifica

Modifica solo `package.json`:

```json
"engines": {
  "node": "24.x"
}
```

Non modifica `dependencies`, `devDependencies`, pagine, componenti, dashboard, Supabase o logica dell'app.

## Come usarlo

1. Copia tutti i file nella root del progetto CODM.
2. Esegui:

```bat
CODM_NODE24_FIX_WINDOWS.bat
```

3. Se la build locale passa, fai:

```bat
git add package.json package-lock.json scripts/apply-node24-fix.mjs CODM_NODE24_FIX_WINDOWS.bat README_CODM_NODE24_FIX.md
git commit -m "chore: use Node 24 for Vercel"
git push origin main
```

4. Su Vercel fai nuovo deploy senza cache.
