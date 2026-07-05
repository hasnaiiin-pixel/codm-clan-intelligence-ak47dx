@echo off
chcp 65001 >nul
cls
echo =====================================================
echo CODM AK47DX V5.6 - PROFILE FASTLANE STABILE
echo =====================================================
echo.
echo Controllo versione frontend...
findstr /S /I "V5_6_PROFILE_FASTLANE_STABILE_OK" app\version\page.tsx public\*.json >nul
if errorlevel 1 (
  echo ERRORE: marker V5.6 non trovato.
  pause
  exit /b 1
)
echo OK: marker V5.6 presente.
echo.
echo Controllo backend profile fastlane...
findstr /S /I "v5_6_profile_fastlane" ocr-backend\app\*.py ocr-backend\app\services\*.py >nul
if errorlevel 1 (
  echo ERRORE: backend profile fastlane non trovato.
  pause
  exit /b 1
)
echo OK: backend profile fastlane presente.
echo.
echo Installo dipendenze se mancano...
if not exist node_modules\next (
  npm ci --legacy-peer-deps
  if errorlevel 1 (
    echo ERRORE: npm ci fallito.
    pause
    exit /b 1
  )
)
echo.
echo Eseguo build...
npm run build
if errorlevel 1 (
  echo ERRORE: build fallita.
  pause
  exit /b 1
)
echo.
echo BUILD OK V5.6.
pause
