@echo off
setlocal
set ROOT=%CD%
echo.
echo [CODM V5.5] Fix DeveloperBrand mancante
if not exist "src" mkdir "src"
if not exist "src\components" mkdir "src\components"
if not exist "public" mkdir "public"
if not exist "public\assets" mkdir "public\assets"
copy /Y "%~dp0src\components\DeveloperBrand.tsx" "src\components\DeveloperBrand.tsx"
copy /Y "%~dp0public\assets\mirza-developer-logo.svg" "public\assets\mirza-developer-logo.svg"
echo.
echo Controllo file:
dir "src\components\DeveloperBrand.tsx"
dir "public\assets\mirza-developer-logo.svg"
echo.
echo Ora eseguo npm run build...
npm run build
if errorlevel 1 (
  echo.
  echo ERRORE: build ancora fallita. Copia il nuovo log.
  pause
  exit /b 1
)
echo.
echo BUILD OK. Ora puoi fare:
echo git add -A
echo git commit -m "fix: add MIRZA developer brand component"
echo git push origin main
pause
