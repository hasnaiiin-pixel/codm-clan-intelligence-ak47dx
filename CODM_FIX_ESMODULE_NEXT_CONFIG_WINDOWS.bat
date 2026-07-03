@echo off
setlocal

echo =====================================================
echo CODM AK47DX - FIX NEXT CONFIG + NODE 24 PER VERCEL
echo =====================================================
echo.

if not exist package.json (
  echo ERRORE: package.json non trovato. Esegui questo BAT nella root del progetto CODM.
  pause
  exit /b 1
)

echo [1/6] Rimuovo vecchio next.config.js se presente...
if exist next.config.js del /f /q next.config.js

echo [2/6] Verifico package.json...
node -e "const fs=require('fs');const p=JSON.parse(fs.readFileSync('package.json','utf8')); if(p.type){console.error('ERRORE: package.json contiene ancora type=',p.type); process.exit(1)}; if(!p.engines||p.engines.node!=='24.x'){console.error('ERRORE: engines.node deve essere 24.x, ora=',p.engines&&p.engines.node); process.exit(1)}; console.log('OK package.json: niente type module, Node 24.x');"
if errorlevel 1 (
  echo.
  echo Sostituisci package.json con quello incluso nello ZIP e rilancia questo BAT.
  pause
  exit /b 1
)

echo [3/6] Verifico next.config.cjs...
if not exist next.config.cjs (
  echo ERRORE: next.config.cjs non trovato. Copia anche next.config.cjs dallo ZIP.
  pause
  exit /b 1
)

echo [4/6] Aggiorno package-lock senza reinstallare tutto...
npm install --package-lock-only --legacy-peer-deps
if errorlevel 1 (
  echo ERRORE durante aggiornamento package-lock.
  pause
  exit /b 1
)

echo [5/6] Test build locale...
npm run build
if errorlevel 1 (
  echo.
  echo Build locale fallita: copia qui il log da ^> next build in poi.
  pause
  exit /b 1
)

echo [6/6] Stato Git...
git status --short

echo.
echo =====================================================
echo FIX OK. Ora esegui:
echo git add -A
echo git commit -m "fix: use CommonJS Next config and Node 24"
echo git push origin main
echo =====================================================
pause
