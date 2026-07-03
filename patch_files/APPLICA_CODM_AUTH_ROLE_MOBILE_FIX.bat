@echo off
setlocal enabledelayedexpansion
cd /d "%~dp0"

echo =========================================================
echo CODM AK47DX - Auth Role Guard + Sidebar Mobile Fix
echo =========================================================

echo.
echo [1/6] Creo backup file importanti...
if not exist _codm_backup_before_auth_role_guard mkdir _codm_backup_before_auth_role_guard
if exist app\layout.tsx copy /Y app\layout.tsx _codm_backup_before_auth_role_guard\layout.tsx >nul
if exist app\login\page.tsx copy /Y app\login\page.tsx _codm_backup_before_auth_role_guard\login_page.tsx >nul
if exist app\globals.css copy /Y app\globals.css _codm_backup_before_auth_role_guard\globals.css >nul

echo [2/6] Copio nuovi file patch...
xcopy /E /I /Y patch_files\components components >nul
xcopy /E /I /Y patch_files\src src >nul
xcopy /E /I /Y patch_files\app app >nul
xcopy /E /I /Y patch_files\supabase supabase >nul
xcopy /E /I /Y patch_files\docs docs >nul
xcopy /E /I /Y patch_files\scripts scripts >nul

echo [3/6] Appendo CSS sidebar/mobile se non gia presente...
findstr /C:"CODM_AUTH_ROLE_MOBILE_FIX_CSS" app\globals.css >nul 2>nul
if errorlevel 1 (
  type patch_files\CODM_AUTH_ROLE_MOBILE_FIX.css >> app\globals.css
) else (
  echo CSS gia presente, salto.
)

echo [4/6] Inserisco guard sulle pagine operative...
node scripts\apply-auth-role-guard.cjs
if errorlevel 1 (
  echo ERRORE: patch guard fallita.
  pause
  exit /b 1
)

echo [5/6] Install e build...
npm install --legacy-peer-deps
if errorlevel 1 (
  echo ERRORE npm install.
  pause
  exit /b 1
)

npm run build
if errorlevel 1 (
  echo.
  echo Build fallita. Guarda errore sopra. Backup disponibile in _codm_backup_before_auth_role_guard
  pause
  exit /b 1
)

echo [6/6] Patch completata correttamente.
echo.
echo Ora esegui:
echo git add -A
echo git commit -m "feat: auth roles, player registration and mobile sidebar"
echo git push origin main
echo.
pause
