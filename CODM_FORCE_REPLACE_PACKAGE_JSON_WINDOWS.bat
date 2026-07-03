@echo off
setlocal
cd /d "%~dp0"

echo ============================================
echo CODM - FORCE PACKAGE.JSON FIX FOR VERCEL
echo ============================================
echo.

if not exist package.json (
  echo ERRORE: package.json non trovato. Copia questo file nella root del progetto CODM.
  pause
  exit /b 1
)

if exist node_modules (
  echo Rimuovo node_modules...
  rmdir /s /q node_modules
)

if exist package-lock.json (
  echo Rimuovo package-lock.json vecchio...
  del /f /q package-lock.json
)

echo.
echo Verifico sintassi JSON...
node scripts\validate-package-json.mjs
if errorlevel 1 (
  echo ERRORE: package.json ancora non valido.
  pause
  exit /b 1
)

echo.
echo Creo package-lock pulito...
npm install --legacy-peer-deps
if errorlevel 1 (
  echo ERRORE durante npm install.
  pause
  exit /b 1
)

echo.
echo Verifico build Next.js...
npm run build
if errorlevel 1 (
  echo ATTENZIONE: package.json e installazione sono OK, ma la build ha un altro errore.
  echo Copia il log da npm run build in poi.
  pause
  exit /b 1
)

echo.
echo ============================================
echo OK: package.json valido + package-lock creato + build completata.
echo Ora fai:
echo git add package.json package-lock.json .npmrc vercel.json scripts/validate-package-json.mjs CODM_FORCE_REPLACE_PACKAGE_JSON_WINDOWS.bat README_CODM_FORCE_PACKAGE_JSON_FIX.md
echo git commit -m "fix: force valid package json for Vercel"
echo git push origin main
echo ============================================
pause
