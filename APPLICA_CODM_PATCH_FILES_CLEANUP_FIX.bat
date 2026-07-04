@echo off
chcp 65001 >nul
cls
echo ======================================================
echo  CODM AK47DX - CLEAN PATCH_FILES BUILD FIX
echo ======================================================
echo.
echo [1/4] Pulizia cartella patch_files e aggiornamento exclude...
node scripts\cleanup-patch-files-build.cjs
if errorlevel 1 (
  echo ERRORE: cleanup fallito.
  pause
  exit /b 1
)

echo.
echo [2/4] Build locale...
npm run build
if errorlevel 1 (
  echo.
  echo ERRORE: build fallita. Copia il log da '^> next build' in poi.
  pause
  exit /b 1
)

echo.
echo [3/4] Build OK.
echo.
echo [4/4] Adesso esegui questi comandi:
echo git add -A
echo git commit -m "fix: remove patch_files from CODM build"
echo git push origin main
echo.
pause
