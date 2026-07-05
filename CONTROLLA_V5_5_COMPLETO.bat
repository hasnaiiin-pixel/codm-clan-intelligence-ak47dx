@echo off
cd /d "%~dp0"
echo [CODM V5.5] Controllo build...
npm run build
if errorlevel 1 (
  echo.
  echo ERRORE: build fallita. Copia il log da next build in poi.
  pause
  exit /b 1
)
echo.
echo OK: build completata.
echo Controlla /version = V5_5_CLEAN_START_LOGO_MEDALS_OK
pause
