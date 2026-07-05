@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo ======================================================
echo CODM AK47DX V4.3 - CONTROLLO COMPLETO
echo ======================================================
echo.
echo [1/5] Controllo file principali...
if not exist app\events\page.tsx echo ERRORE: manca app\events\page.tsx & exit /b 1
if not exist app\api\telegram\reminders\route.ts echo ERRORE: manca app\api\telegram\reminders\route.ts & exit /b 1
if not exist app\api\telegram\test\route.ts echo ERRORE: manca app\api\telegram\test\route.ts & exit /b 1
if not exist app\ocr-status\page.tsx echo ERRORE: manca app\ocr-status\page.tsx & exit /b 1
if not exist src\components\MobileSidebar.tsx echo ERRORE: manca src\components\MobileSidebar.tsx & exit /b 1
if not exist tailwind.config.js echo ERRORE: manca tailwind.config.js & exit /b 1
if not exist postcss.config.js echo ERRORE: manca postcss.config.js & exit /b 1
echo OK file principali.

echo [2/5] Pulizia build locale...
if exist .next rmdir /s /q .next

echo [3/5] Install dipendenze...
call npm ci --legacy-peer-deps
if errorlevel 1 exit /b 1

echo [4/5] Build...
call npm run build
if errorlevel 1 exit /b 1

echo [5/5] OK.
echo Ora fai: git add -A ^&^& git commit -m "fix: CODM v4.3 mobile permessi OCR progress" ^&^& git push origin main
pause
