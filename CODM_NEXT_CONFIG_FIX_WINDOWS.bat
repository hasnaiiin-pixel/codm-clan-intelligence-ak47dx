@echo off
setlocal enabledelayedexpansion

echo ============================================================
echo CODM Clan Intelligence - Fix next.config.js / type module

echo ============================================================
echo.

if not exist package.json (
  echo ERRORE: package.json non trovato.
  echo Copia questo file nella root del progetto CODM e riprova.
  pause
  exit /b 1
)

if not exist scripts\apply-codm-next-config-fix.cjs (
  echo ERRORE: script scripts\apply-codm-next-config-fix.cjs non trovato.
  echo Copia anche la cartella scripts nella root del progetto.
  pause
  exit /b 1
)

echo [1/4] Applico fix package.json / next.config...
node scripts\apply-codm-next-config-fix.cjs
if errorlevel 1 (
  echo.
  echo ERRORE durante applicazione fix.
  pause
  exit /b 1
)

echo.
echo [2/4] Pulizia node_modules e package-lock...
if exist node_modules rmdir /s /q node_modules
if exist package-lock.json del /f /q package-lock.json

echo.
echo [3/4] Installazione dipendenze...
npm install --legacy-peer-deps
if errorlevel 1 (
  echo.
  echo ERRORE durante npm install.
  pause
  exit /b 1
)

echo.
echo [4/4] Test build locale...
npm run build
if errorlevel 1 (
  echo.
  echo ATTENZIONE: build fallita. Copia qui il log dopo "next build".
  pause
  exit /b 1
)

echo.
echo ============================================================
echo OK: fix applicato e build locale completata.
echo Ora fai commit e push:
echo git add package.json package-lock.json scripts/apply-codm-next-config-fix.cjs CODM_NEXT_CONFIG_FIX_WINDOWS.bat README_CODM_NEXT_CONFIG_FIX.md
echo git commit -m "fix: resolve Next config module format on Vercel"
echo git push origin main
echo ============================================================
echo.
pause
