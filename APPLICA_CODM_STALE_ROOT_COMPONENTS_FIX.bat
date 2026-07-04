@echo off
chcp 65001 >nul
setlocal

echo ======================================================
echo  CODM AK47DX - STALE ROOT COMPONENTS FIX
echo ======================================================

if not exist package.json (
  echo ERRORE: package.json non trovato. Esegui dalla root del progetto CODM.
  pause
  exit /b 1
)

echo [1/5] Creo cartelle corrette...
if not exist src mkdir src
if not exist src\components mkdir src\components
if not exist scripts mkdir scripts

echo [2/5] Copio WriteAccessBlock nel percorso corretto...
copy /Y src\components\WriteAccessBlock.tsx src\components\WriteAccessBlock.tsx >nul 2>nul
copy /Y patch_files\src\components\WriteAccessBlock.tsx src\components\WriteAccessBlock.tsx >nul 2>nul
if not exist src\components\WriteAccessBlock.tsx (
  echo ERRORE: impossibile copiare src\components\WriteAccessBlock.tsx.
  pause
  exit /b 1
)

echo [3/5] Copio script e rimuovo duplicati root...
copy /Y patch_files\scripts\fix-stale-root-components.cjs scripts\fix-stale-root-components.cjs >nul
node scripts\fix-stale-root-components.cjs
if errorlevel 1 (
  echo ERRORE: fix duplicati fallito.
  pause
  exit /b 1
)

echo [4/5] Build locale...
call npm run build
if errorlevel 1 (
  echo ERRORE: build fallita. Copia il log da ^> next build in poi.
  pause
  exit /b 1
)

echo [5/5] Fix completato.
echo.
echo Ora esegui:
echo git add -A
echo git commit -m "fix: remove stale root components and correct supabase imports"
echo git push origin main
echo.
pause
