@echo off
setlocal
cd /d "%~dp0"
echo ======================================================
echo  CODM AK47DX V4.2 - CONTROLLO COMPLETO
echo ======================================================

echo [1/5] Verifico file grafica...
if not exist tailwind.config.js echo ERRORE: manca tailwind.config.js && pause && exit /b 1
if not exist postcss.config.js echo ERRORE: manca postcss.config.js && pause && exit /b 1
findstr /C:"@tailwind utilities" app\globals.css >nul || (echo ERRORE: app\globals.css non contiene @tailwind utilities && pause && exit /b 1)
findstr /C:"ak-login-page" app\globals.css >nul || (echo ERRORE: CSS V4.2 login non presente && pause && exit /b 1)
findstr /C:"ak-sidebar" app\globals.css >nul || (echo ERRORE: CSS V4.2 sidebar non presente && pause && exit /b 1)

echo [2/5] Verifico route principali...
if not exist app\version\page.tsx echo ERRORE: manca /version && pause && exit /b 1
if not exist app\cache-reset\page.tsx echo ERRORE: manca /cache-reset && pause && exit /b 1
if not exist app\events\page.tsx echo ERRORE: manca /events && pause && exit /b 1
if not exist app\ocr-status\page.tsx echo ERRORE: manca /ocr-status && pause && exit /b 1
if not exist app\api\telegram\reminders\route.ts echo ERRORE: manca API Telegram reminders && pause && exit /b 1
if not exist app\api\telegram\status\route.ts echo ERRORE: manca API Telegram status && pause && exit /b 1

echo [3/5] Verifico componenti...
if not exist src\components\MobileSidebar.tsx echo ERRORE: manca MobileSidebar && pause && exit /b 1
if not exist src\components\WriteAccessBlock.tsx echo ERRORE: manca WriteAccessBlock && pause && exit /b 1
if not exist src\lib\ocrBackend.ts echo ERRORE: manca ocrBackend && pause && exit /b 1

echo [4/5] Install/build...
npm ci --legacy-peer-deps
if errorlevel 1 echo ERRORE: npm ci fallito && pause && exit /b 1
npm run build
if errorlevel 1 echo ERRORE: build fallita && pause && exit /b 1

echo [5/5] OK. Ora puoi fare commit e push.
echo git add -A
echo git commit -m "fix: CODM v4.2 grafica generale e OCR Render"
echo git push origin main
pause
