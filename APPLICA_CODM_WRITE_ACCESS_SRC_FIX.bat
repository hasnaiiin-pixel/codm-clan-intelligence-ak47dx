@echo off
setlocal

echo ======================================================
echo  CODM AK47DX - WRITE ACCESS SRC PATH FIX
echo ======================================================

if not exist package.json (
  echo ERRORE: package.json non trovato. Esegui questo BAT dalla root del progetto.
  pause
  exit /b 1
)

echo [1/5] Creo cartella src\components...
if not exist src mkdir src
if not exist src\components mkdir src\components

echo [2/5] Copio WriteAccessBlock nel percorso corretto...
copy /Y "%~dp0src\components\WriteAccessBlock.tsx" "src\components\WriteAccessBlock.tsx" >nul
if not exist scripts mkdir scripts
copy /Y "%~dp0scripts\check-write-access-src.cjs" "scripts\check-write-access-src.cjs" >nul

echo [3/5] Verifico alias e componente...
node scripts\check-write-access-src.cjs
if errorlevel 1 (
  echo ERRORE: verifica fallita.
  pause
  exit /b 1
)

echo [4/5] Build locale...
call npm run build
if errorlevel 1 (
  echo.
  echo ERRORE: build fallita. Se compare un nuovo errore, copia il log da ^> next build in poi.
  pause
  exit /b 1
)

echo [5/5] OK. Ora fai:
echo git add -A
echo git commit -m "fix: place WriteAccessBlock under src components alias"
echo git push origin main
pause
