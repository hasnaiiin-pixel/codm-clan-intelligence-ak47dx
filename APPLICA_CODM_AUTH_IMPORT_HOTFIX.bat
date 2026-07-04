@echo off
setlocal enabledelayedexpansion
cls
echo ======================================================
echo  CODM AK47DX - AUTH USERS + IMPORT MATCH HOTFIX
echo ======================================================

if not exist package.json (
  echo ERRORE: esegui questo BAT dalla root del progetto CODM.
  pause
  exit /b 1
)

if not exist app mkdir app
if not exist src mkdir src
if not exist src\components mkdir src\components
if not exist supabase mkdir supabase
if not exist scripts mkdir scripts

echo [1/7] Pulizia cartelle temporanee patch_files vecchie...
if exist patch_files_old rmdir /s /q patch_files_old
if exist patch_files (
  ren patch_files patch_files_old
)

echo [2/7] Copio file aggiornati...
xcopy /E /I /Y "%~dp0patch_files\app" app >nul
xcopy /E /I /Y "%~dp0patch_files\src" src >nul
xcopy /E /I /Y "%~dp0patch_files\supabase" supabase >nul
xcopy /E /I /Y "%~dp0patch_files\scripts" scripts >nul

echo [3/7] Rimuovo duplicati root components obsoleti...
if exist components\WriteAccessBlock.tsx ren components\WriteAccessBlock.tsx WriteAccessBlock.tsx.bak_hotfix
if exist components\MobileSidebar.tsx ren components\MobileSidebar.tsx MobileSidebar.tsx.bak_hotfix
if exist components\PwaInstaller.tsx ren components\PwaInstaller.tsx PwaInstaller.tsx.bak_hotfix

echo [4/7] Aggiorno .gitignore...
if not exist .gitignore type nul > .gitignore
findstr /C:"patch_files" .gitignore >nul || echo patch_files/>>.gitignore
findstr /C:"patch_files_old" .gitignore >nul || echo patch_files_old/>>.gitignore
findstr /C:"*.bak_hotfix" .gitignore >nul || echo *.bak_hotfix>>.gitignore

echo [5/7] Verifico file...
node scripts\check-codm-auth-import-hotfix.cjs
if errorlevel 1 (
  echo ERRORE: verifica fallita.
  pause
  exit /b 1
)

echo [6/7] Build locale...
npm run build
if errorlevel 1 (
  echo.
  echo ERRORE: build fallita. Copia il log da ^> next build in poi.
  pause
  exit /b 1
)

echo [7/7] COMPLETATO.
echo.
echo Ora esegui su Supabase SQL Editor:
echo   supabase\05_auth_profiles_admin_approval.sql
echo.
echo Poi fai:
echo   git add -A
echo   git commit -m "fix: auth user approval and import match client crash"
echo   git push origin main
echo.
pause
