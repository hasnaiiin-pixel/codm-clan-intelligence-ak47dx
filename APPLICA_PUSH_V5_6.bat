@echo off
chcp 65001 >nul
cls
echo =====================================================
echo CODM AK47DX V5.6 - APPLICA BUILD E PUSH
echo =====================================================
echo.
echo Installo dipendenze se mancano...
if not exist node_modules\next (
  npm ci --legacy-peer-deps
  if errorlevel 1 (
    echo ERRORE: npm ci fallito.
    pause
    exit /b 1
  )
)
echo.
echo Eseguo build...
npm run build
if errorlevel 1 (
  echo ERRORE: build fallita. Copia il log.
  pause
  exit /b 1
)
echo.
echo Commit e push...
git add -A
git commit -m "fix: CODM v5.6 profile fastlane stabile"
git push origin main
if errorlevel 1 (
  echo ERRORE: git push fallito.
  pause
  exit /b 1
)
echo.
echo OK: V5.6 inviata su GitHub. Attendi Vercel Ready/Production.
pause
