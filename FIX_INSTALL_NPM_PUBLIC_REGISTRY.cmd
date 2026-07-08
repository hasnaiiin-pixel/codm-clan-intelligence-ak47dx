@echo off
setlocal
cd /d "%~dp0"
echo ========================================
echo CLAN MANAGER V11.0A - FIX NPM REGISTRY
echo ========================================
echo Chiudo eventuali processi node.exe...
taskkill /F /IM node.exe >nul 2>nul

echo Imposto registry pubblico npm...
npm config set registry https://registry.npmjs.org/
npm config delete proxy >nul 2>nul
npm config delete https-proxy >nul 2>nul

echo Pulizia cartelle build/installazione...
if exist node_modules rmdir /s /q node_modules
if exist .next rmdir /s /q .next

echo Pulizia cache npm...
npm cache clean --force

echo Installazione dipendenze...
npm ci --legacy-peer-deps
if errorlevel 1 (
  echo ERRORE durante npm ci.
  pause
  exit /b 1
)

echo Build produzione...
npm run build
if errorlevel 1 (
  echo ERRORE durante npm run build.
  pause
  exit /b 1
)

echo.
echo OK: installazione e build completate.
pause
