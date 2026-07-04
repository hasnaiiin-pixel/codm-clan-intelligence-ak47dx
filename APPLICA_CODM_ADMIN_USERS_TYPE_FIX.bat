@echo off
setlocal
chcp 65001 >nul

echo ======================================================
echo  CODM AK47DX - ADMIN USERS TYPE FIX
echo ======================================================

echo [1/5] Verifico posizione progetto...
if not exist package.json (
  echo ERRORE: package.json non trovato. Esegui questo BAT dalla root del progetto CODM.
  pause
  exit /b 1
)

if not exist app\admin\users\page.tsx (
  echo ERRORE: app\admin\users\page.tsx non trovato.
  pause
  exit /b 1
)

echo [2/5] Applico fix TypeScript pagina admin utenti...
node patch_files\scripts\fix-admin-users-type.cjs
if errorlevel 1 (
  echo ERRORE: fix pagina admin utenti fallito.
  pause
  exit /b 1
)

echo [3/5] Verifico file aggiornato...
node patch_files\scripts\check-admin-users-type.cjs
if errorlevel 1 (
  echo ERRORE: verifica fallita.
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

echo [5/5] OK.
echo.
echo Ora fai:
echo git add -A
echo git commit -m "fix: normalize admin users profile relation type"
echo git push origin main
echo.
pause
