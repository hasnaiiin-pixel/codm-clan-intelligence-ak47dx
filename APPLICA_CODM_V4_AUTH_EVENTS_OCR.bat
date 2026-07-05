@echo off
setlocal
cd /d "%~dp0"
echo ======================================================
echo  CODM AK47DX - V4 AUTH + EVENTS + OCR UPDATE
echo ======================================================

if not exist package.json (
  echo ERRORE: devi eseguire questo BAT nella root del progetto CODM, dove c'e' package.json.
  pause
  exit /b 1
)

if not exist __codm_v4_source (
  echo ERRORE: cartella __codm_v4_source mancante. Estrai TUTTO lo ZIP nella root del progetto.
  pause
  exit /b 1
)

if not exist scripts mkdir scripts
copy /Y scripts\apply-codm-v4.cjs scripts\apply-codm-v4.cjs >nul 2>nul

echo [1/6] Applico patch unica V4...
node scripts\apply-codm-v4.cjs
if errorlevel 1 (
  echo ERRORE: patch fallita.
  pause
  exit /b 1
)

echo [2/6] Pulisco cartella sorgente patch per non farla compilare da Next...
rmdir /s /q __codm_v4_source 2>nul

echo [3/6] Controllo npm install se serve...
if not exist node_modules (
  npm install --legacy-peer-deps
  if errorlevel 1 (
    echo ERRORE: npm install fallito.
    pause
    exit /b 1
  )
)

echo [4/6] Build locale...
npm run build
if errorlevel 1 (
  echo ERRORE: build fallita. Copia il log da ^> next build in poi.
  pause
  exit /b 1
)

echo [5/6] Stato git...
git status --short

echo [6/6] FATTO.
echo Ora esegui in Supabase: supabase\06_auth_events_telegram_ocr_v4.sql
echo Poi:
echo   git add -A
echo   git commit -m "feat: CODM v4 auth events OCR telegram"
echo   git push origin main
pause
