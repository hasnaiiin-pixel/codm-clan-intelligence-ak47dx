@echo off
setlocal
cls
echo ======================================================
echo  CODM AK47DX - WRITE ACCESS BLOCK FIX
echo ======================================================

if not exist package.json (
  echo ERRORE: esegui questo file dalla root del progetto CODM.
  pause
  exit /b 1
)

echo [1/5] Creo cartella components...
if not exist components mkdir components

echo [2/5] Copio WriteAccessBlock.tsx...
copy /Y "%~dp0components\WriteAccessBlock.tsx" "components\WriteAccessBlock.tsx" >nul

echo [3/5] Verifico componente...
if not exist scripts mkdir scripts
copy /Y "%~dp0scripts\check-write-access-block.cjs" "scripts\check-write-access-block.cjs" >nul
node scripts\check-write-access-block.cjs
if errorlevel 1 (
  echo ERRORE: verifica componente fallita.
  pause
  exit /b 1
)

echo [4/5] Build locale...
call npm run build
if errorlevel 1 (
  echo ERRORE: build fallita. Copia il log da 'npm run build' in poi.
  pause
  exit /b 1
)

echo [5/5] OK. Ora fai commit e push:
echo git add -A
echo git commit -m "fix: add missing WriteAccessBlock component"
echo git push origin main
pause
endlocal
