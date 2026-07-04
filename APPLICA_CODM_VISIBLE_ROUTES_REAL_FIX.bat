@echo off
setlocal
cd /d "%~dp0"

echo ============================================================
echo CODM - FIX REALE /version e /cache-reset
echo ============================================================

if not exist package.json (
  echo ERRORE: devi avviare questo BAT dalla root del progetto CODM.
  pause
  exit /b 1
)

node scripts\apply-codm-visible-routes-real-fix.cjs
if errorlevel 1 (
  echo ERRORE durante applicazione patch.
  pause
  exit /b 1
)

echo.
echo Verifico build...
npm run build
if errorlevel 1 (
  echo.
  echo BUILD FALLITA. Copia qui il log dopo "next build".
  pause
  exit /b 1
)

echo.
echo OK: build completata.
echo Ora esegui:
echo git add -A
echo git commit -m "fix: repair visible version and cache reset routes"
echo git push origin main
pause
