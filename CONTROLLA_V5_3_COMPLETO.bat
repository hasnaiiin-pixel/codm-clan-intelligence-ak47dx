@echo off
title CODM AK47DX V5.3 - Controllo completo
echo.
echo ===============================================
echo CODM AK47DX V5.3 IMPORT NO ABORT TEMPLATE TABLE
echo ===============================================
echo.
node -v
npm -v
echo.
npm ci --legacy-peer-deps
if errorlevel 1 goto fail
npm run build
if errorlevel 1 goto fail
echo.
echo BUILD OK - V5.3 pronta per git push.
pause
exit /b 0
:fail
echo.
echo ERRORE: build fallita. Copia il log da next build in poi.
pause
exit /b 1
