@echo off
title CODM - Fix package.json and redeploy preparation
echo.
echo ============================================
echo  CODM Clan Intelligence - Package JSON Fix
echo ============================================
echo.

cd /d "%~dp0"

echo [1/5] Verifica package.json...
node -e "JSON.parse(require('fs').readFileSync('package.json','utf8')); console.log('package.json OK')"
if errorlevel 1 (
  echo.
  echo ERRORE: package.json non e' valido.
  pause
  exit /b 1
)

echo.
echo [2/5] Pulizia installazione locale...
if exist node_modules rmdir /s /q node_modules
if exist package-lock.json del package-lock.json

echo.
echo [3/5] Pulizia cache npm...
npm cache clean --force

echo.
echo [4/5] Installazione dipendenze...
npm install --legacy-peer-deps
if errorlevel 1 (
  echo.
  echo ERRORE: npm install fallito.
  pause
  exit /b 1
)

echo.
echo [5/5] Build di controllo...
npm run build
if errorlevel 1 (
  echo.
  echo ATTENZIONE: installazione OK, ma build fallita.
  echo Copia il log da "npm run build" in poi.
  pause
  exit /b 1
)

echo.
echo ============================================
echo  OK: package.json valido e build completata
echo ============================================
echo.
echo Ora esegui:
echo git add package.json package-lock.json .npmrc
echo git commit -m "fix: correct package json for Vercel"
echo git push origin main
echo.
pause
