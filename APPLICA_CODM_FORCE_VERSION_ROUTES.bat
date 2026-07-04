@echo off
setlocal enabledelayedexpansion

echo ======================================================
echo  CODM AK47DX - FORCE VERSION ROUTES + VERIFY
echo ======================================================

echo [1/6] Creo cartelle...
if not exist app mkdir app
if not exist app\version mkdir app\version
if not exist app\cache-reset mkdir app\cache-reset
if not exist public mkdir public
if not exist scripts mkdir scripts

echo [2/6] Copio pagine /version e /cache-reset...
copy /Y patch_files\app\version\page.tsx app\version\page.tsx >nul
copy /Y patch_files\app\cache-reset\page.tsx app\cache-reset\page.tsx >nul
copy /Y patch_files\public\codm-release.json public\codm-release.json >nul
copy /Y patch_files\scripts\verify-codm-routes.cjs scripts\verify-codm-routes.cjs >nul

echo [3/6] Verifico file...
node scripts\verify-codm-routes.cjs
if errorlevel 1 (
  echo.
  echo ERRORE: route non valide. Controlla output sopra.
  pause
  exit /b 1
)

echo [4/6] Build locale...
call npm run build
if errorlevel 1 (
  echo.
  echo ERRORE: build fallita. Copia il log da 'npm run build' in poi.
  pause
  exit /b 1
)

echo [5/6] Stato git...
git status --short

echo.
echo [6/6] FATTO.
echo Adesso fai:
echo git add -A
echo git commit -m "fix: force version and cache reset routes"
echo git push origin main
echo.
echo Dopo deploy Vercel, nella lista route devi vedere /version e /cache-reset.
echo Poi apri: https://TUO-DOMINIO.vercel.app/version
echo.
pause
