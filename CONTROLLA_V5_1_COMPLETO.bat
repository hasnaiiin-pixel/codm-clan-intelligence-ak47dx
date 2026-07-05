@echo off
cd /d %~dp0
echo === CODM V5.1 CHECK ===
node -v
npm -v
npm run build
if errorlevel 1 (
  echo.
  echo ERRORE: build fallita. Copia il log da next build in poi.
  pause
  exit /b 1
)
echo.
echo OK: build V5.1 completata.
pause
