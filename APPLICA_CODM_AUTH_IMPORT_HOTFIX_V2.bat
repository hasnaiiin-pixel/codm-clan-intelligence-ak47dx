@echo off
setlocal enabledelayedexpansion
cd /d "%~dp0"

echo ======================================================
echo  CODM AK47DX - AUTH USERS + IMPORT MATCH HOTFIX V2
echo ======================================================

echo [0/8] Verifico posizione progetto...
if not exist package.json (
  echo ERRORE: package.json non trovato. Copia questo ZIP nella root del progetto CODM e riesegui.
  pause
  exit /b 1
)
if not exist app (
  echo ERRORE: cartella app non trovata. Sei nella root sbagliata.
  pause
  exit /b 1
)
if not exist src (
  echo ERRORE: cartella src non trovata. Sei nella root sbagliata.
  pause
  exit /b 1
)
if not exist patch_source (
  echo ERRORE: cartella patch_source non trovata.
  echo Devi estrarre tutto lo ZIP, non solo il file BAT.
  pause
  exit /b 1
)

echo [1/8] Pulizia cartelle temporanee vecchie...
if exist patch_files rmdir /s /q patch_files
if exist components\WriteAccessBlock.tsx ren components\WriteAccessBlock.tsx WriteAccessBlock.tsx.bak_%RANDOM%
if exist components\MobileSidebar.tsx ren components\MobileSidebar.tsx MobileSidebar.tsx.bak_%RANDOM%

echo [2/8] Copio file aggiornati da patch_source...
xcopy /E /I /Y patch_source\app app >nul
if errorlevel 1 (
  echo ERRORE: copia cartella app fallita.
  pause
  exit /b 1
)
xcopy /E /I /Y patch_source\src src >nul
if errorlevel 1 (
  echo ERRORE: copia cartella src fallita.
  pause
  exit /b 1
)
xcopy /E /I /Y patch_source\scripts scripts >nul
if errorlevel 1 (
  echo ERRORE: copia cartella scripts fallita.
  pause
  exit /b 1
)
xcopy /E /I /Y patch_source\supabase supabase >nul
if errorlevel 1 (
  echo ERRORE: copia cartella supabase fallita.
  pause
  exit /b 1
)

echo [3/8] Aggiorno .gitignore per evitare patch temporanee...
if not exist .gitignore type nul > .gitignore
findstr /C:"patch_files/" .gitignore >nul || echo patch_files/>>.gitignore
findstr /C:"patch_source/" .gitignore >nul || echo patch_source/>>.gitignore
findstr /C:"*.bak_*" .gitignore >nul || echo *.bak_*>>.gitignore

echo [4/8] Applico fix hook-safe su /import/match...
node scripts\fix-codm-import-match-hooks.cjs
if errorlevel 1 (
  echo ERRORE: fix import/match fallito.
  pause
  exit /b 1
)

echo [5/8] Verifico file copiati...
node scripts\check-codm-auth-import-hotfix.cjs
if errorlevel 1 (
  echo ERRORE: verifica fallita.
  pause
  exit /b 1
)

echo [6/8] Build locale...
call npm run build
if errorlevel 1 (
  echo ERRORE: build fallita. Copia il log da ^> next build in poi.
  pause
  exit /b 1
)

echo [7/8] Stato git...
git status --short

echo [8/8] COMPLETATO.
echo.
echo ORA ESEGUI PRIMA IN SUPABASE SQL EDITOR:
echo   supabase\05_auth_profiles_admin_approval.sql
echo.
echo POI FAI PUSH:
echo   git add -A
echo   git commit -m "fix: auth approval and import match client crash"
echo   git push origin main
echo.
pause
