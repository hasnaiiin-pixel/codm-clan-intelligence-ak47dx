@echo off
setlocal
cd /d "%~dp0"
echo.
echo === CODM AK47DX V5.5.1 - controllo build e push ===
echo.
if not exist package.json (
  echo ERRORE: esegui questo BAT dalla root del progetto, dove c'e package.json.
  pause
  exit /b 1
)
if not exist src\components\DeveloperBrand.tsx (
  echo ERRORE: manca src\components\DeveloperBrand.tsx
  pause
  exit /b 1
)
if not exist public\assets\mirza-developer-logo.png (
  echo ERRORE: manca public\assets\mirza-developer-logo.png
  pause
  exit /b 1
)
echo OK: file DeveloperBrand e logo MIRZA presenti.
echo.
echo Eseguo build locale...
call npm run build
if errorlevel 1 (
  echo.
  echo ERRORE: build fallita. Copia il log da npm run build in poi.
  pause
  exit /b 1
)
echo.
echo Build OK. Commit e push...
git add -A
git commit -m "fix: CODM v5.5.1 build fix developer brand logo"
if errorlevel 1 (
  echo.
  echo Nota: git commit non ha creato commit. Forse non ci sono modifiche nuove.
)
git push origin main
if errorlevel 1 (
  echo.
  echo ERRORE: git push fallito. Controlla connessione o credenziali GitHub.
  pause
  exit /b 1
)
echo.
echo OK: push completato. Ora aspetta Vercel Ready / Production.
pause
