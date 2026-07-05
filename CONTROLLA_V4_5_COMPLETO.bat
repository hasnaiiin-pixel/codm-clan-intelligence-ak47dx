@echo off
echo ======================================================
echo CODM AK47DX V4.5 - CONTROLLO COMPLETO
echo ======================================================
if not exist package.json echo ERRORE: package.json mancante & pause & exit /b 1
if not exist app\import\match\page.tsx echo ERRORE: import match mancante & pause & exit /b 1
if not exist app\events\page.tsx echo ERRORE: events mancante & pause & exit /b 1
if not exist app\api\telegram\reminders\route.ts echo ERRORE: telegram reminders mancante & pause & exit /b 1
if not exist ocr-backend\app\main.py echo ERRORE: backend OCR mancante & pause & exit /b 1
echo File principali presenti.
echo.
echo Build Next...
call npm run build
if errorlevel 1 echo ERRORE: build fallita & pause & exit /b 1
echo.
echo OK V4.5 build completata.
pause
