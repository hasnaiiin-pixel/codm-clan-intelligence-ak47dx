@echo off
setlocal
cd /d "%~dp0"
echo ======================================================
echo  CODM AK47DX - MOBILE SIDEBAR SRC PATH FIX
echo ======================================================

echo [1/5] Creo cartella src\components...
if not exist "src\components" mkdir "src\components"
if not exist "scripts" mkdir "scripts"

echo [2/5] Copio componenti nel percorso corretto...
copy /Y "patch_files\src\components\MobileSidebar.tsx" "src\components\MobileSidebar.tsx" >nul
copy /Y "patch_files\src\components\PwaInstaller.tsx" "src\components\PwaInstaller.tsx" >nul
copy /Y "patch_files\scripts\check-mobile-sidebar-src.cjs" "scripts\check-mobile-sidebar-src.cjs" >nul

echo [3/5] Verifico componenti...
node "scripts\check-mobile-sidebar-src.cjs"
if errorlevel 1 goto errore

echo [4/5] Build locale...
call npm run build
if errorlevel 1 goto errore

echo [5/5] OK. Adesso fai commit e push:
echo git add -A
echo git commit -m "fix: place MobileSidebar and PwaInstaller under src components alias"
echo git push origin main
pause
exit /b 0

:errore
echo ERRORE: build fallita. Copia il log da ^> next build in poi.
pause
exit /b 1
