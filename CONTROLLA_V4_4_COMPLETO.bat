@echo off
setlocal
chcp 65001 >nul
echo ======================================================
echo  CODM AK47DX - CONTROLLO V4.4 COMPLETO
echo ======================================================
if not exist package.json echo ERRORE: package.json non trovato & exit /b 1
if not exist app\events\page.tsx echo ERRORE: manca app\events\page.tsx & exit /b 1
if not exist app\api\telegram\reminders\route.ts echo ERRORE: manca telegram reminders & exit /b 1
if not exist app\api\telegram\test\route.ts echo ERRORE: manca telegram test & exit /b 1
if not exist app\import\match\page.tsx echo ERRORE: manca import match & exit /b 1
if not exist ocr-backend\app\main.py echo ERRORE: manca backend OCR & exit /b 1
echo OK file principali presenti.
echo.
echo Build frontend...
call npm run build
if errorlevel 1 (
  echo ERRORE: build frontend fallita.
  exit /b 1
)
echo.
echo Build OK. Ora puoi fare git add -A, commit e push.
