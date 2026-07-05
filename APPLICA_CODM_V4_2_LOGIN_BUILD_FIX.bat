@echo off
setlocal
chcp 65001 >nul

echo ======================================================
echo  CODM AK47DX - V4.2 LOGIN BUILD FIX
echo ======================================================

if not exist package.json (
  echo ERRORE: esegui questo file dalla root del progetto CODM.
  pause
  exit /b 1
)

if not exist app\login mkdir app\login
copy /Y "%~dp0app\login\page.tsx" "app\login\page.tsx" >nul
if errorlevel 1 (
  echo ERRORE: copia app\login\page.tsx fallita.
  pause
  exit /b 1
)

echo ✅ app\login\page.tsx corretto.
echo.
echo Avvio build locale...
call npm run build
if errorlevel 1 (
  echo.
  echo ERRORE: build fallita. Copia il log da ^> next build in poi.
  pause
  exit /b 1
)

echo.
echo ✅ Build OK. Ora puoi fare:
echo git add -A
echo git commit -m "fix: repair V4.2 login build"
echo git push origin main
pause
