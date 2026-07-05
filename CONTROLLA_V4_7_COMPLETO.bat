@echo off
chcp 65001 >nul
echo ======================================================
echo  CODM AK47DX - CONTROLLO V4.7 TEMPLATE PRIORITY IMPORT
echo ======================================================
echo.
if not exist package.json (
  echo ERRORE: package.json non trovato. Avvia questo file dalla root del progetto.
  pause
  exit /b 1
)
if not exist app\import\match\page.tsx echo ERRORE: manca app\import\match\page.tsx
if not exist app\calibration\page.tsx echo ERRORE: manca app\calibration\page.tsx
if not exist ocr-backend\app\services\scoreboard_ced.py echo ERRORE: manca backend OCR scoreboard_ced.py
if not exist src\lib\ocrBackend.ts echo ERRORE: manca src\lib\ocrBackend.ts

echo [1/3] Versioni attese...
findstr /C:"V4_7_TEMPLATE_PRIORITY_IMPORT_OK" app\version\page.tsx
findstr /C:"2.0.6-v4-7-template-priority-import-ak47dx" src\lib\ocrBackend.ts
findstr /C:"2.0.6-v4-7-template-priority-import-ak47dx" ocr-backend\app\main.py

echo.
echo [2/3] Build Next...
call npm run build
if errorlevel 1 (
  echo.
  echo ERRORE: build fallita. Copia il log da next build in poi.
  pause
  exit /b 1
)

echo.
echo [3/3] OK. Dopo push, aggiorna anche Render OCR con ocr-backend.
pause
