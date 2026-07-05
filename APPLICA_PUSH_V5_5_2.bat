@echo off
setlocal
cd /d "%~dp0"
echo.
echo =====================================================
echo CODM AK47DX V5.5.2 - BUILD FIX DEFINITIVO
echo =====================================================
echo.
echo Controllo che app\layout.tsx NON importi DeveloperBrand...
findstr /I /C:"DeveloperBrand" app\layout.tsx >nul
if %errorlevel%==0 (
  echo ERRORE: app\layout.tsx contiene ancora DeveloperBrand.
  echo Questo pacchetto non e stato copiato correttamente.
  pause
  exit /b 1
)
echo OK: nessun import DeveloperBrand nel layout.

echo.
echo Controllo logo MIRZA...
if not exist public\assets\mirza-developer-logo.png (
  echo ERRORE: manca public\assets\mirza-developer-logo.png
  pause
  exit /b 1
)
echo OK: logo MIRZA presente.

echo.
echo Eseguo build...
call npm run build
if errorlevel 1 (
  echo.
  echo ERRORE: build fallita. Copia il log da next build in poi.
  pause
  exit /b 1
)

echo.
echo Build OK. Commit e push...
git add -A
git commit -m "fix: CODM v5.5.2 remove DeveloperBrand import" || echo Nessuna modifica da committare.
git push origin main

echo.
echo Push completato. Aspetta Vercel Ready/Production e apri /version.
pause
