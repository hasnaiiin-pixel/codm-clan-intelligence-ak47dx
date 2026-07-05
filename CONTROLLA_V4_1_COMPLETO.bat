@echo off
chcp 65001 >nul
echo ======================================================
echo  CODM AK47DX V4.1 - CONTROLLO COMPLETO
echo ======================================================
echo.
if not exist package.json (
  echo ERRORE: package.json non trovato. Apri questo BAT dalla root progetto.
  pause
  exit /b 1
)

echo [1/6] Controllo file grafica Tailwind/PostCSS...
if not exist tailwind.config.js echo ERRORE: manca tailwind.config.js && pause && exit /b 1
if not exist postcss.config.js echo ERRORE: manca postcss.config.js && pause && exit /b 1
if not exist app\globals.css echo ERRORE: manca app\globals.css && pause && exit /b 1

echo [2/6] Controllo componenti UI...
if not exist src\components\MobileSidebar.tsx echo ERRORE: manca src\components\MobileSidebar.tsx && pause && exit /b 1
if not exist src\components\PwaInstaller.tsx echo ERRORE: manca src\components\PwaInstaller.tsx && pause && exit /b 1
if not exist src\components\WriteAccessBlock.tsx echo ERRORE: manca src\components\WriteAccessBlock.tsx && pause && exit /b 1

echo [3/6] Controllo route principali...
if not exist app\version\page.tsx echo ERRORE: manca /version && pause && exit /b 1
if not exist app\cache-reset\page.tsx echo ERRORE: manca /cache-reset && pause && exit /b 1
if not exist app\events\page.tsx echo ERRORE: manca /events && pause && exit /b 1
if not exist app\ocr-status\page.tsx echo ERRORE: manca /ocr-status && pause && exit /b 1
if not exist app\admin\users\page.tsx echo ERRORE: manca /admin/users && pause && exit /b 1

echo [4/6] Controllo API server...
if not exist app\api\telegram\reminders\route.ts echo ERRORE: manca /api/telegram/reminders && pause && exit /b 1
if not exist app\api\telegram\status\route.ts echo ERRORE: manca /api/telegram/status && pause && exit /b 1
if not exist app\api\health\route.ts echo ERRORE: manca /api/health && pause && exit /b 1

echo [5/6] Controllo OCR Render...
findstr /c:"2.0.1-deployable-pwa-yolo-ak47dx" src\lib\ocrBackend.ts >nul
if errorlevel 1 echo ERRORE: OCR backend non allineato a 2.0.1 && pause && exit /b 1

echo [6/6] Build locale...
call npm run build
if errorlevel 1 (
  echo ERRORE: build fallita.
  pause
  exit /b 1
)

echo.
echo ✅ CONTROLLO V4.1 COMPLETATO. Build OK.
echo Ora puoi fare: git add -A ^&^& git commit -m "fix: CODM v4.1 ui telegram ocr aligned" ^&^& git push origin main
pause
