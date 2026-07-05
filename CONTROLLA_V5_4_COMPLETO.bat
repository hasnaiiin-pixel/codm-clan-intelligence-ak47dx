@echo off
cd /d "%~dp0"
echo === CODM V5.4 FASTLANE IMPORT STABILE ===
node -v
npm -v
npm ci --legacy-peer-deps
if errorlevel 1 goto ERR
npm run build
if errorlevel 1 goto ERR
echo.
echo BUILD OK - V5.4 pronta per push.
pause
exit /b 0
:ERR
echo.
echo ERRORE: build fallita. Copia il log da next build in poi.
pause
exit /b 1
