@echo off
setlocal
cd /d "%~dp0"
echo [CODM V5.2] Controllo build frontend...
call npm ci --legacy-peer-deps
if errorlevel 1 goto err
call npm run build
if errorlevel 1 goto err
echo.
echo OK: build V5.2 completata.
pause
exit /b 0
:err
echo.
echo ERRORE: build fallita. Copia il log da npm run build in poi.
pause
exit /b 1
