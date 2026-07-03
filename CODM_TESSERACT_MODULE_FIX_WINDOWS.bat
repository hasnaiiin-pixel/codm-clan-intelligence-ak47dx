@echo off
chcp 65001 >nul
setlocal

echo ==========================================================
echo CODM Clan Intelligence - FIX tesseract.js module not found
echo ==========================================================
echo.

if not exist package.json (
  echo ERRORE: package.json non trovato.
  echo Copia questo file nella root del progetto codm-clan-intelligence-ak47dx.
  pause
  exit /b 1
)

if not exist scripts\apply-codm-tesseract-fix.cjs (
  echo ERRORE: scripts\apply-codm-tesseract-fix.cjs non trovato.
  echo Copia anche la cartella scripts nella root del progetto.
  pause
  exit /b 1
)

echo [1/4] Aggiorno package.json...
node scripts\apply-codm-tesseract-fix.cjs
if errorlevel 1 (
  echo ERRORE durante aggiornamento package.json.
  pause
  exit /b 1
)

echo.
echo [2/4] Installo tesseract.js e aggiorno package-lock.json...
npm install tesseract.js@^7.0.0 --save --legacy-peer-deps
if errorlevel 1 (
  echo ERRORE durante npm install tesseract.js.
  pause
  exit /b 1
)

echo.
echo [3/4] Verifico package.json...
node -e "JSON.parse(require('fs').readFileSync('package.json','utf8')); console.log('OK: package.json valido')"
if errorlevel 1 (
  echo ERRORE: package.json non valido.
  pause
  exit /b 1
)

echo.
echo [4/4] Provo build locale...
npm run build
if errorlevel 1 (
  echo.
  echo ATTENZIONE: la build locale ha ancora errori.
  echo Copia l'errore completo dopo ^> next build.
  pause
  exit /b 1
)

echo.
echo ==========================================================
echo OK: fix applicato. Ora fai git add/commit/push.
echo ==========================================================
echo.
echo Comandi consigliati:
echo git add -A
echo git commit -m "fix: add tesseract OCR dependency for CODM build"
echo git push origin main
echo.
pause
