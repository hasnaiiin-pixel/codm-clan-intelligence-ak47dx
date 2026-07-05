@echo off
chcp 65001 >nul
echo ======================================================
echo  CODM AK47DX - CONTROLLO V4.6 TEMPLATE NOTIFICHE
echo ======================================================
if not exist package.json (
  echo ERRORE: package.json non trovato. Esegui dalla root progetto.
  pause
  exit /b 1
)
if not exist app\notifications\page.tsx echo ERRORE: manca app\notifications\page.tsx
if not exist app\api\telegram\reminders\route.ts echo ERRORE: manca API reminders
if not exist app\import\match\page.tsx echo ERRORE: manca import match
if not exist ocr-backend\app\main.py echo ERRORE: manca backend OCR
findstr /C:"V4_6_TEMPLATE_NOTIFICHE_PERMESSI_OK" app\version\page.tsx >nul || echo ERRORE: marker V4.6 non trovato in /version
findstr /C:"calibration_frame" app\import\match\page.tsx >nul || echo ERRORE: import non invia calibration_frame
findstr /C:"2.0.5-v4-6-template-notifications-ak47dx" ocr-backend\app\main.py >nul || echo ERRORE: backend OCR non è 2.0.5 V4.6
echo.
echo Build Next...
call npm run build
if errorlevel 1 (
  echo ERRORE: build fallita. Copia il log da ^> next build in poi.
  pause
  exit /b 1
)
echo OK: controllo V4.6 completato.
pause
