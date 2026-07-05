@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

cd /d "%~dp0"

echo.
echo =====================================================
echo CODM AK47DX V5.5.2 - INSTALL + BUILD + PUSH FIX
echo =====================================================
echo.

if not exist package.json (
  echo ERRORE: package.json non trovato.
  echo Devi eseguire questo BAT dentro la root del progetto CODM.
  pause
  exit /b 1
)

where node >nul 2>nul
if errorlevel 1 (
  echo ERRORE: Node.js non trovato.
  echo Installa Node.js LTS e riapri il terminale.
  pause
  exit /b 1
)

where npm >nul 2>nul
if errorlevel 1 (
  echo ERRORE: npm non trovato.
  echo Reinstalla Node.js LTS.
  pause
  exit /b 1
)

echo Controllo che app\layout.tsx NON importi DeveloperBrand...
if exist app\layout.tsx (
  findstr /I "DeveloperBrand" app\layout.tsx >nul 2>nul
  if not errorlevel 1 (
    echo ERRORE: app\layout.tsx contiene ancora DeveloperBrand.
    echo Hai copiato una versione vecchia o non hai sostituito bene i file.
    pause
    exit /b 1
  ) else (
    echo OK: nessun import DeveloperBrand nel layout.
  )
) else (
  echo ERRORE: app\layout.tsx non trovato.
  pause
  exit /b 1
)

echo.
echo Controllo logo MIRZA...
if exist public\assets\mirza-developer-logo.png (
  echo OK: logo MIRZA PNG presente.
) else (
  echo AVVISO: logo MIRZA PNG non trovato in public\assets.
  echo La build puo passare comunque, ma il logo potrebbe non vedersi.
)

echo.
echo Installo dipendenze. Questo sistema risolve: "next non e riconosciuto".
if exist package-lock.json (
  call npm ci --legacy-peer-deps
) else (
  call npm install --legacy-peer-deps
)
if errorlevel 1 (
  echo.
  echo ERRORE: installazione dipendenze fallita.
  pause
  exit /b 1
)

echo.
echo Eseguo build locale...
call npm run build
if errorlevel 1 (
  echo.
  echo ERRORE: build fallita. Copia il log da next build in poi.
  pause
  exit /b 1
)

echo.
echo Build OK. Eseguo commit e push...
call git add -A
call git commit -m "fix: CODM v5.5.2 build install ready"
if errorlevel 1 (
  echo Nessun nuovo commit creato oppure niente da committare. Continuo con push...
)
call git push origin main
if errorlevel 1 (
  echo.
  echo ERRORE: push fallito. Controlla GitHub login/permessi.
  pause
  exit /b 1
)

echo.
echo =====================================================
echo OK: push completato. Ora aspetta Vercel Ready / Production.
echo Controlla poi /version = V5_5_2_NO_DEVELOPERBRAND_IMPORT_OK
echo =====================================================
pause
exit /b 0
