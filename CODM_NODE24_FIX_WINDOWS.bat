@echo off
setlocal

echo ================================================
echo CODM / AK47DX - FIX NODE 24 PER VERCEL
echo ================================================
echo.

if not exist package.json (
  echo ERRORE: package.json non trovato.
  echo Copia questi file nella root del progetto CODM e rilancia.
  pause
  exit /b 1
)

node scripts\apply-node24-fix.mjs
if errorlevel 1 (
  echo.
  echo ERRORE durante aggiornamento package.json.
  pause
  exit /b 1
)

echo.
echo Controllo JSON package.json...
node -e "JSON.parse(require('fs').readFileSync('package.json','utf8')); console.log('OK: package.json valido')"
if errorlevel 1 (
  echo.
  echo ERRORE: package.json non valido.
  pause
  exit /b 1
)

echo.
echo Pulizia installazione locale...
if exist node_modules rmdir /s /q node_modules
if exist package-lock.json del package-lock.json

echo.
echo Installazione dipendenze...
npm install --legacy-peer-deps
if errorlevel 1 (
  echo.
  echo ERRORE durante npm install.
  pause
  exit /b 1
)

echo.
echo Build locale...
npm run build
if errorlevel 1 (
  echo.
  echo BUILD FALLITA. Copia l'errore mostrato sopra.
  pause
  exit /b 1
)

echo.
echo ================================================
echo OK: Node 24 fix applicato e build locale riuscita.
echo Ora fai:
echo git add package.json package-lock.json scripts/apply-node24-fix.mjs CODM_NODE24_FIX_WINDOWS.bat README_CODM_NODE24_FIX.md
echo git commit -m "chore: use Node 24 for Vercel"
echo git push origin main
echo ================================================
echo.
pause
