@echo off
setlocal
cd /d "%~dp0"
echo ======================================================
echo CODM AK47DX V4.9 OCR 4.6 STABILE - CONTROLLO BUILD
echo ======================================================
echo.
echo Versione attesa frontend: V4_9_OCR46_STABILE_OK
echo Backend OCR atteso: 2.0.5-v4-6-template-notifications-ak47dx
echo.
node -v
npm -v
echo.
echo [1/2] installazione dipendenze...
call npm ci --legacy-peer-deps
if errorlevel 1 goto ERR
echo.
echo [2/2] build Next...
call npm run build
if errorlevel 1 goto ERR
echo.
echo OK: build completata. Puoi fare git add/commit/push.
pause
exit /b 0
:ERR
echo.
echo ERRORE: build fallita. Copia il log completo.
pause
exit /b 1
