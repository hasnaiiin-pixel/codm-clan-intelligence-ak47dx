@echo off
cd /d "%~dp0"
echo =====================================================
echo CODM AK47DX V5.7 - PROFILE TEMPLATE FRAME OCR
echo =====================================================
if not exist package.json (
  echo ERRORE: esegui questo BAT dalla root progetto.
  pause
  exit /b 1
)
echo Installo dipendenze...
call npm ci --legacy-peer-deps
if errorlevel 1 (
  echo ERRORE: npm ci fallito.
  pause
  exit /b 1
)
echo Build locale...
call npm run build
if errorlevel 1 (
  echo ERRORE: build fallita.
  pause
  exit /b 1
)
echo Git push...
git add -A
git commit -m "fix: CODM v5.7 profile template frame OCR"
if errorlevel 1 (
  git commit --allow-empty -m "chore: redeploy CODM v5.7 profile template frame OCR"
)
git push origin main
pause
