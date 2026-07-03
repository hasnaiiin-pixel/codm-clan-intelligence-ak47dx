# CODM Clan Intelligence — Fix deploy Vercel npm install

Questo pacchetto serve per correggere il blocco Vercel:

```txt
npm error Exit handler never called!
Error: Command "npm install" exited with 1
```

## File inclusi

```txt
.npmrc
vercel.json
scripts/apply-codm-vercel-fix.mjs
scripts/check-codm-vercel-ready.mjs
```

## Dove mettere i file

Copia tutti i file nella root del progetto:

```txt
codm-clan-intelligence-ak47dx/
├─ package.json
├─ .npmrc
├─ vercel.json
└─ scripts/
   ├─ apply-codm-vercel-fix.mjs
   └─ check-codm-vercel-ready.mjs
```

## Procedura Windows consigliata

Apri CMD o PowerShell nella cartella del progetto CODM e lancia:

```bat
node scripts\apply-codm-vercel-fix.mjs
rmdir /s /q node_modules
 del package-lock.json
npm cache clean --force
npm install --legacy-peer-deps
npm run build
node scripts\check-codm-vercel-ready.mjs
```

Se `del package-lock.json` dice che il file non esiste, va bene.

## Push su GitHub

```bat
git add package.json package-lock.json .npmrc vercel.json scripts/apply-codm-vercel-fix.mjs scripts/check-codm-vercel-ready.mjs README_CODM_VERCEL_FIX.md
git commit -m "fix: stabilize CODM deploy on Vercel"
git push origin main
```

## Impostazioni Vercel

Nel progetto Vercel usa:

```txt
Framework Preset: Next.js
Node.js Version: 20.x
Install Command: npm ci --legacy-peer-deps
Build Command: npm run build
Output Directory: lascia vuoto
```

## Variabili ambiente minime CODM

```txt
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

Se è già previsto OCR backend separato:

```txt
NEXT_PUBLIC_OCR_API_URL=
```

## Nota importante

Non sostituire manualmente il tuo `package.json` con un file generico: rischi di perdere dipendenze del progetto CODM. Usa lo script `apply-codm-vercel-fix.mjs`, che modifica il tuo `package.json` esistente e crea anche un backup.
